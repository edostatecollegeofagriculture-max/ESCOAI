from dotenv import load_dotenv
load_dotenv()
import os, json, click
from datetime import datetime, timezone
from app import create_app
from app.extensions import db
from app.models.portal_record import PortalRecord
app = create_app(os.environ.get('FLASK_CONFIG', 'development'))

@app.cli.command('init-db')
def init_db():
    """Create all database tables."""
    with app.app_context(): db.create_all()
    click.echo('Database tables created successfully.')

@app.cli.command('import-legacy-json')
@click.option('--file', 'file_path', required=True, help='Path to a separately reviewed legacy JSON export; never import bundled demo credentials into production.')
@click.option('--replace', is_flag=True, help='Replace existing records in collections present in the import.')
def import_legacy_json(file_path, replace):
    """Import the existing portal's data without changing IDs or API field names."""
    path = os.path.abspath(os.path.join(os.path.dirname(__file__), file_path))
    if not os.path.isfile(path): raise click.ClickException(f'Legacy JSON file not found: {path}')
    with open(path, encoding='utf-8') as f: data = json.load(f)
    users = data.get('users', []) if isinstance(data, dict) else []
    hash_counts = {}
    for user in users if isinstance(users, list) else []:
        hashed = user.get('passwordHash') if isinstance(user, dict) else None
        if hashed:
            hash_counts[hashed] = hash_counts.get(hashed, 0) + 1
    if any(count >= 3 for count in hash_counts.values()):
        raise click.ClickException('The export contains a password hash shared by three or more accounts. Remove demo/test accounts or reset shared credentials in the source export before importing production users.')
    with app.app_context():
        db.create_all()
        for collection, value in data.items():
            rows = [dict(value)] if collection == 'settings' and isinstance(value, dict) else value if isinstance(value, list) else []
            if not rows: continue
            if replace: PortalRecord.query.filter_by(collection=collection).delete()
            for obj in rows:
                key = str(obj.get('id') or obj.get('email') or 'default')
                existing = PortalRecord.query.filter_by(collection=collection, record_key=key).first()
                if existing: existing.payload = obj
                else: db.session.add(PortalRecord(collection=collection, record_key=key, payload=obj))
        db.session.commit()
    click.echo(f'Imported legacy data from {path}')

@app.cli.command('create-admin')
@click.option('--email', prompt=True, help='Administrator email')
@click.option('--password', prompt=True, hide_input=True, confirmation_prompt=True, help='Administrator password (minimum 12 characters)')
@click.option('--name', prompt=True, help='Administrator full name')
def create_admin(email, password, name):
    from werkzeug.security import generate_password_hash
    if len(password) < 12 or len(password) > 128:
        raise click.ClickException('Administrator password must be 12â€“128 characters.')
    if '@' not in email or len(email) > 254:
        raise click.ClickException('Enter a valid administrator email address.')
    with app.app_context():
        db.create_all(); email=email.strip().lower()
        existing=PortalRecord.query.filter_by(collection='users').all()
        if any((r.payload.get('email','').lower()==email) for r in existing):
            click.echo('Error: User with this email already exists.'); return
        uid=__import__('uuid').uuid4().hex
        payload={'id':uid,'email':email,'fullName':name.strip(),'passwordHash':generate_password_hash(password),'role':'SUPER_ADMIN','isActive':True,'isLocked':False,'failedLoginAttempts':0,'createdAt':datetime.now(timezone.utc).isoformat()}
        db.session.add(PortalRecord(collection='users',record_key=uid,payload=payload));db.session.commit()
    click.echo(f"Super Administrator created: {email}")

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
