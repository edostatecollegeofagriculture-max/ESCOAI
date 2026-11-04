# EDSCOAI / EDOCASTI School Management Portal

React + TypeScript frontend deployed to **Vercel**, Python Flask REST API deployed to **Render**, structured records stored in **Neon PostgreSQL**, and uploaded images/documents stored in **Cloudinary**.

## Production architecture

- **Vercel:** React 19, TypeScript, Vite static frontend.
- **Render:** Flask API served by Gunicorn. Render's environment variables hold secrets.
- **Neon:** PostgreSQL structured database. The app uses `DATABASE_URL` and enforces TLS (`sslmode=require`) when it is absent from the connection URL.
- **Cloudinary:** Authenticated uploads for images and common documents. The API stores/returns secure Cloudinary URLs; the binary files are not stored on Render's ephemeral filesystem.

The persistence model intentionally keeps legacy domain collections in `portal_records` with JSON payloads to preserve existing API response shapes and IDs. This is structured SQL storage but not a normalized relational redesign. The deployment ZIP excludes bundled demo database exports and shared demo password hashes.

## 1. Create Neon database

1. Create a Neon project and database.
2. In Neon, copy the **pooled** connection string for the application (recommended for web traffic). Keep the password private.
3. In Render, set `DATABASE_URL` to that connection string. Use the full URL, including its database, user and password. The app converts `postgres://` URLs and adds `sslmode=require` if missing.
4. The first Render deploy runs `flask init-db` as its pre-deploy command to create tables. This does not import demo/seed users.
5. If you have real legacy data to migrate, securely transfer a separately reviewed JSON export to the backend environment and run `flask import-legacy-json --file /secure/path/edocasti_export.json` once after taking a database backup. The deployment package intentionally does **not** include the source project's demo database or shared demo password hashes. Do not commit real exports to Git. Do not use `--replace` against live data unless replacement is intentional and a restorable backup exists. Reset every imported user's password before opening the system to users.

## 2. Configure Cloudinary

1. Create a Cloudinary account and copy the cloud name, API key and API secret from the dashboard.
2. Set these **Render environment variables**:
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`
   - `CLOUDINARY_FOLDER=edscoai`
3. Alternatively, set `CLOUDINARY_URL` instead of the three separate credentials.
4. The authenticated endpoint is `POST /api/v1/uploads`, with multipart field `file` and optional `folder`. Include `Authorization: Bearer <JWT>`. Maximum file size is 10 MB. The server checks file signatures for supported images and documents; ZIP uploads are deliberately disabled. Staff roles can upload public images. Documents are uploaded to a per-user **private** Cloudinary folder.
5. For images, save the returned `url` as the CMS image URL. For private documents, persist `publicId` and `format`, not the temporary `url`; the temporary URL expires after 10 minutes. Request a fresh URL through `POST /api/v1/uploads/download-url` with `{ "publicId": "...", "format": "pdf" }`. A user can access their own private folder; authorized staff can retrieve private documents for administrative workflows.

Example frontend usage:

```ts
const uploaded = await api.uploadFile(file, 'news');
if (!uploaded.private) {
  // Save uploaded.url as the public image URL in the CMS record.
}
// For private documents, save uploaded.publicId and uploaded.format.
```

The API never exposes Cloudinary API secrets to the browser. Existing images must be uploaded to Cloudinary separately if you want all legacy media moved there. Validate your Cloudinary account's access controls and retention settings before storing student records.

## 3. Deploy Flask API to Render

1. Push this project to a Git repository.
2. In Render, choose **New + → Blueprint** and select the repository. Render reads `render.yaml` and creates the `edscoai-api` web service.
3. Set the Render environment variables:
   - `DATABASE_URL`: Neon connection string
   - `CORS_ORIGINS`: exact Vercel production domain(s), comma-separated, e.g. `https://edscoai.vercel.app,https://www.example.com`
   - Cloudinary variables listed above
   - `SECRET_KEY` and `JWT_SECRET_KEY`: unique long random secrets. Render generates values from the blueprint, but verify them in the dashboard.
4. Wait for the service to deploy. Verify `https://YOUR-RENDER-SERVICE.onrender.com/api/health` returns JSON with `status: UP` and `database: UP`.
5. Open the Render Shell for the backend and create the first real super administrator with `flask create-admin`. Use a unique institutional email and a strong 12+ character password. The package intentionally does not seed shared demo accounts.
6. Add the institution's approved schools, departments, programmes, courses and fee schedules using the authorized administration workflow. Do not import demo data into the production database.
7. Do not set `IMPORT_LEGACY_SEED=true` in production. Schema creation is performed by `preDeployCommand`; any reviewed legacy import is a deliberate, one-time operation.

## 4. Deploy React frontend to Vercel

1. In Vercel, import the same Git repository.
2. Set the **Root Directory** to the project root (the directory containing `package.json` and `vercel.json`).
3. Build settings: `npm run build`; output directory: `dist` (the included `vercel.json` sets these values).
4. Add the environment variable `VITE_API_BASE_URL` for Production and any Preview environments that should use the API. Its value is the Render origin only, for example:

   ```text
   https://YOUR-RENDER-SERVICE.onrender.com
   ```

   Do not append `/api/v1`. The frontend appends that path automatically. Redeploy after changing frontend environment variables.
5. Copy the deployed Vercel domain into Render's `CORS_ORIGINS`, save, and redeploy the Render service. Include custom domains as well if used.

## Production prerequisites that must be completed before deployment

1. Provision a Redis-compatible shared rate-limit store and set `RATELIMIT_STORAGE_URI` on Render (for example, the provider-issued `rediss://...` URL). Do not use an in-memory store in production.
2. Set every secret in Render's environment settings; never commit them. Verify `DATABASE_URL` is Neon PostgreSQL with TLS and the database has a tested backup/restore procedure.
3. Set `CORS_ORIGINS` to exact `https://` Vercel/custom-domain origins. Do not include a wildcard or localhost.
4. Run the included automated tests and frontend build in CI, then smoke-test the deployed health endpoint and every role-sensitive workflow using test data.
5. Confirm Cloudinary private-document delivery and retention policies with non-public test files before uploading real student documents.

## 5. Local development (Windows PowerShell)

```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
$env:FLASK_CONFIG = 'development'
$env:SECRET_KEY = 'local-only-change-me'
$env:JWT_SECRET_KEY = 'another-local-only-secret'
python run.py
```

In another terminal at the repository root:

```powershell
npm install
npm run dev
```

Vite proxies `/api/*` to `http://127.0.0.1:5000` locally. For the frontend deployed to Vercel, use `VITE_API_BASE_URL` instead of the local proxy.

## Environment variables summary

| Variable | Where | Purpose |
|---|---|---|
| `DATABASE_URL` | Render | Neon PostgreSQL connection string |
| `SECRET_KEY` | Render | Flask signing secret |
| `JWT_SECRET_KEY` | Render | JWT signing secret; keep distinct from `SECRET_KEY` |
| `CORS_ORIGINS` | Render | Comma-separated allowed frontend origins |
| `CLOUDINARY_CLOUD_NAME` | Render | Cloudinary account identifier |
| `CLOUDINARY_API_KEY` | Render | Cloudinary server API key |
| `CLOUDINARY_API_SECRET` | Render | Cloudinary server API secret |
| `CLOUDINARY_FOLDER` | Render | Root folder for uploaded assets |
| `VITE_API_BASE_URL` | Vercel | Render API origin without `/api/v1` |

## Security and readiness notes

- Never commit `.env`, Neon connection strings, Cloudinary secrets, Redis URLs or production JWT secrets.
- Production refuses to start without long, separate `SECRET_KEY` and `JWT_SECRET_KEY`, PostgreSQL/TLS, exact HTTPS `CORS_ORIGINS`, and shared Redis-compatible rate-limit storage.
- Security headers are added at both the Vercel frontend and Flask API. The frontend has a Content Security Policy that should be narrowed to the exact Render API hostname after deployment. Authentication/user responses are marked `no-store`; JWT access tokens expire after 30 minutes by default. The server checks account status on each authenticated request so deactivated/locked accounts are rejected.
- Production UI no longer exposes the role switcher, shared demo password or quick-demo login buttons. The bundled demo database and its shared demo password hashes are excluded; the importer rejects exports with a password hash shared by three or more accounts.
- Login and registration have rate limits. Failed logins do not permanently lock an account, avoiding an unauthenticated account-lockout denial-of-service vector.
- Public search no longer returns student/applicant PII. Public CMS listings only expose published articles and active slides; draft articles are staff-only.
- User creation restricts privileged role assignment. Passwords for new accounts and password changes must be 12–128 characters.
- Uploads require authentication, role checks, file-size limits and content-signature checks. Images are public assets; documents are stored privately and accessed through short-lived signed download URLs. Do not store temporary document URLs as permanent links.
- The SQL compatibility layer stores legacy records as JSON payloads in PostgreSQL. This preserves compatibility but is not a normalized relational schema; conduct a staged schema redesign with constraints, foreign keys, indexes and transactional workflows before treating this as a mature SIS database.
- Payment initiation remains a pending record, not a verified live payment integration. Do not represent payments as successful until a provider webhook/signature and reconciliation flow are implemented and tested.
- Tests and a frontend build could not be executed in the packaging environment because Python packages and Vite dependencies could not be downloaded. Run `pip install -r backend/requirements.txt`, `python -m unittest discover -s backend/tests`, and `npm ci && npm run build` in CI before deployment.
- This package is a security-hardened deployment candidate, **not a certification that the application is fully production-ready**. Before real student data is used, complete CI tests, dependency vulnerability scanning, backup/restore rehearsal, database migration planning, role-by-role acceptance tests, payment-provider verification and an independent security review.
