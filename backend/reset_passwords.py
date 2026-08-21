from app.core.database import SessionLocal
from app.models.user import User
from app.core.security import hash_password

def reset_all_passwords():
    db = SessionLocal()
    users = db.query(User).all()
    print(f"Found {len(users)} users in database:")
    
    for u in users:
        role_str = str(u.role).lower()
        if 'admin' in role_str or u.email == 'admin@hms.com':
            pw = 'admin123'
        elif 'billing' in role_str:
            pw = 'Billing@123' if u.email != 'billing@hms.com' else 'billing123'
        elif 'doctor' in role_str:
            pw = 'Doctor@123'
        elif 'reception' in role_str:
            pw = 'Reception@123'
        elif 'nurse' in role_str:
            pw = 'Nurse@123'
        elif 'store' in role_str:
            pw = 'Store@123'
        elif 'lab' in role_str:
            pw = 'Lab@123'
        elif 'pharmacy' in role_str:
            pw = 'Pharma@123'
        else:
            pw = 'Admin@123'
            
        u.hashed_password = hash_password(pw)
        u.is_active = True
        u.status = "Active"
        print(f"  - {u.name} ({u.email}) [Role: {u.role}] -> password: {pw}")
        
    db.commit()
    db.close()
    print("\nSUCCESS: All user passwords updated successfully!")

if __name__ == "__main__":
    reset_all_passwords()
