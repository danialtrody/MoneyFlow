from typing import Optional

from sqlalchemy.orm import Session

from models.user import User


def get_by_email(db: Session, email: str) -> Optional[User]:
    return db.query(User).filter(User.email == email).first()


def update(
    db: Session,
    user: User,
    full_name: Optional[str] = None,
    hashed_password: Optional[str] = None,
) -> User:
    if full_name is not None:
        user.full_name = full_name
    if hashed_password is not None:
        user.hashed_password = hashed_password
    db.commit()
    db.refresh(user)
    return user


def get_by_google_id(db: Session, google_id: str) -> Optional[User]:
    return db.query(User).filter(User.google_id == google_id).first()


def set_google_id(db: Session, user: User, google_id: str) -> User:
    user.google_id = google_id
    db.commit()
    db.refresh(user)
    return user


def create(
    db: Session,
    email: str,
    full_name: str,
    hashed_password: Optional[str] = None,
    google_id: Optional[str] = None,
) -> User:
    user = User(
        email=email,
        hashed_password=hashed_password,
        full_name=full_name,
        google_id=google_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
