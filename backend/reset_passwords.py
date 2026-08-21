from app.core.database import SessionLocal
from app.models.user import User
from app.core.security import hash_password

def reset_all_passwords():
    db = SessionLocal()
    users = db.query(User).all()
    print(f"Found {len(users)} users in database:")

    new_hash = hash_password("123456")
    for u in users:
        u.hashed_password = new_hash
        u.is_active = True
        u.status = "Active"
        print(f"  - {u.name} ({u.email}) [Role: {u.role}] -> password: 123456")

    db.commit()
    db.close()
    print("\nSUCCESS: All user passwords reset to 123456!")

if __name__ == "__main__":
    reset_all_passwords()
