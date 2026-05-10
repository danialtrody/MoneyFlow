from typing import Optional

from sqlalchemy.orm import Session

from models.user import User


def get_by_email(db: Session, email: str) -> Optional[User]:
    return db.query(User).filter(User.email == email).first()


def create(
    db: Session,
    email: str,
    hashed_password: str,
    full_name: str,
) -> User:
    user = User(email=email, hashed_password=hashed_password, full_name=full_name)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
