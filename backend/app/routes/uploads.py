"""Authenticated Cloudinary uploads with role-aware public/private delivery."""
import os
import re
import time
from pathlib import Path
from flask import Blueprint, current_app, jsonify, request
from flask_jwt_extended import jwt_required
from werkzeug.utils import secure_filename
import cloudinary
import cloudinary.uploader
import cloudinary.utils
from app.extensions import limiter
from app.routes.portal import current_user

uploads_bp = Blueprint("uploads", __name__, url_prefix="/api/v1/uploads")
IMAGE_EXTENSIONS = {"png", "jpg", "jpeg", "webp", "gif", "avif"}
DOCUMENT_EXTENSIONS = {"pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "csv"}
STAFF_UPLOAD_ROLES = {"SUPER_ADMIN", "ADMIN", "ICT_ADMIN", "CONTENT_EDITOR", "REGISTRAR", "ADMISSIONS_OFFICER", "LECTURER", "HOD", "BURSAR"}


def _cloudinary_configured():
    return bool(os.environ.get("CLOUDINARY_URL") or (
        os.environ.get("CLOUDINARY_CLOUD_NAME") and
        os.environ.get("CLOUDINARY_API_KEY") and
        os.environ.get("CLOUDINARY_API_SECRET")
    ))


def _configure_cloudinary():
    if os.environ.get("CLOUDINARY_URL"):
        cloudinary.config(secure=True)
    else:
        cloudinary.config(
            cloud_name=os.environ.get("CLOUDINARY_CLOUD_NAME"),
            api_key=os.environ.get("CLOUDINARY_API_KEY"),
            api_secret=os.environ.get("CLOUDINARY_API_SECRET"),
            secure=True,
        )


def _looks_valid(ext, stream):
    """Reject obvious extension/content mismatches before sending to Cloudinary."""
    stream.seek(0)
    head = stream.read(16)
    stream.seek(0)
    if ext in {"jpg", "jpeg"}: return head.startswith(b"\xff\xd8\xff")
    if ext == "png": return head.startswith(b"\x89PNG\r\n\x1a\n")
    if ext == "gif": return head.startswith((b"GIF87a", b"GIF89a"))
    if ext == "webp": return head.startswith(b"RIFF") and head[8:12] == b"WEBP"
    if ext == "avif": return len(head) >= 12 and head[4:8] == b"ftyp" and b"avif" in head[8:16]
    if ext == "pdf": return head.startswith(b"%PDF-")
    if ext in {"docx", "xlsx", "pptx"}: return head.startswith(b"PK\x03\x04")
    if ext in {"doc", "xls", "ppt"}: return head.startswith(b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1")
    if ext in {"txt", "csv"}:
        try:
            sample = stream.read(4096)
            return b"\x00" not in sample
        finally:
            stream.seek(0)
    return False


@uploads_bp.post("")
@jwt_required()
@limiter.limit("20 per hour")
def upload_file():
    actor = current_user()
    if not actor or not actor.get("isActive", True) or actor.get("isLocked", False):
        return jsonify(success=False, message="An active account is required."), 403
    if not _cloudinary_configured():
        return jsonify(success=False, message="Cloudinary is not configured on the server."), 503
    uploaded = request.files.get("file")
    if not uploaded or not uploaded.filename:
        return jsonify(success=False, message="Choose a file to upload."), 400
    filename = secure_filename(uploaded.filename)
    if not filename or len(filename) > 180 or filename.startswith("."):
        return jsonify(success=False, message="Invalid filename."), 400
    extension = Path(filename).suffix.lower().lstrip(".")
    if extension not in IMAGE_EXTENSIONS | DOCUMENT_EXTENSIONS:
        return jsonify(success=False, message="This file type is not allowed."), 415
    size_limit = min(int(os.environ.get("MAX_UPLOAD_BYTES", 10 * 1024 * 1024)), 10 * 1024 * 1024)
    uploaded.stream.seek(0, os.SEEK_END)
    size = uploaded.stream.tell()
    uploaded.stream.seek(0)
    if size <= 0:
        return jsonify(success=False, message="The uploaded file is empty."), 400
    if size > size_limit:
        return jsonify(success=False, message="File exceeds the 10 MB upload limit."), 413
    if not _looks_valid(extension, uploaded.stream):
        return jsonify(success=False, message="File content does not match the selected file type."), 415

    folder = re.sub(r"[^a-zA-Z0-9_-]+", "-", request.form.get("folder", "general")).strip("-_")[:40] or "general"
    is_image = extension in IMAGE_EXTENSIONS
    if is_image and actor.get("role") not in STAFF_UPLOAD_ROLES and actor.get("category") not in ("APPLICANT", "STUDENT"):
        return jsonify(success=False, message="Only authorized staff can publish images."), 403
    if not is_image and actor.get("role") not in STAFF_UPLOAD_ROLES | {"APPLICANT", "STUDENT"}:
        return jsonify(success=False, message="Your role cannot upload documents."), 403

    _configure_cloudinary()
    root_folder = os.environ.get("CLOUDINARY_FOLDER", "edscoai").strip("/") or "edscoai"
    if not is_image:
        # Keep personal uploads segregated; never place student documents in a public CMS folder.
        safe_user_id = re.sub(r"[^a-zA-Z0-9_-]+", "-", str(actor.get("id", "user")))[:80]
        folder = f"private/{safe_user_id}"
    try:
        options = {
            "folder": f"{root_folder}/{folder}",
            "resource_type": "image" if is_image else "raw",
            "type": "upload" if is_image else "private",
            "use_filename": True,
            "unique_filename": True,
            "overwrite": False,
            "filename_override": filename,
            "invalidate": False,
        }
        result = cloudinary.uploader.upload(uploaded, **options)
        if is_image:
            url = result.get("secure_url")
            expires_at = None
        else:
            # Private authenticated delivery URL expires after 10 minutes.
            expires_at = int(time.time()) + 600
            url = cloudinary.utils.private_download_url(
                result.get("public_id"), result.get("format") or extension,
                expires_at=expires_at, attachment=True, resource_type="raw",
            )
    except Exception:
        current_app.logger.exception("Cloudinary upload failed")
        return jsonify(success=False, message="The file could not be uploaded. Please try again."), 502

    return jsonify(
        success=True, url=url, publicId=result.get("public_id"),
        resourceType=result.get("resource_type"), format=result.get("format", extension),
        bytes=result.get("bytes", size), originalFilename=filename,
        private=not is_image, expiresAt=expires_at,
    ), 201


@uploads_bp.post("/download-url")
@jwt_required()
@limiter.limit("30 per hour")
def private_download_url():
    """Issue a short-lived download URL for a private raw document owned by the user or staff."""
    actor = current_user()
    if not actor or not actor.get("isActive", True) or actor.get("isLocked", False):
        return jsonify(success=False, message="An active account is required."), 403
    data = request.get_json(silent=True) or {}
    public_id = str(data.get("publicId", ""))
    fmt = str(data.get("format", ""))
    root = os.environ.get("CLOUDINARY_FOLDER", "edscoai").strip("/") or "edscoai"
    if not public_id or ".." in public_id or not public_id.startswith(root + "/private/"):
        return jsonify(success=False, message="Invalid private document reference."), 400
    owner_id = re.sub(r"[^a-zA-Z0-9_-]+", "-", str(actor.get("id", "user")))[:80]
    own_prefix = f"{root}/private/{owner_id}/"
    is_staff = actor.get("role") in STAFF_UPLOAD_ROLES
    if not is_staff and not public_id.startswith(own_prefix):
        return jsonify(success=False, message="You are not allowed to access this document."), 403
    if fmt not in DOCUMENT_EXTENSIONS:
        return jsonify(success=False, message="Invalid document format."), 400
    if not _cloudinary_configured():
        return jsonify(success=False, message="Cloudinary is not configured on the server."), 503
    _configure_cloudinary()
    try:
        expires_at = int(time.time()) + 600
        url = cloudinary.utils.private_download_url(
            public_id, fmt, expires_at=expires_at, attachment=True, resource_type="raw"
        )
    except Exception:
        current_app.logger.exception("Could not create private download URL")
        return jsonify(success=False, message="The document could not be retrieved."), 502
    return jsonify(success=True, url=url, expiresAt=expires_at), 200
