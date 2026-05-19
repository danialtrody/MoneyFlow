import os
from datetime import datetime, timedelta, timezone

from jose import jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from models.user import User
from repositories import user_repository
from schemas.user import UserCreate, UserUpdate

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

SECRET_KEY: str = os.environ["SECRET_KEY"]
ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES: int = int(
    os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30")
)


def create_access_token(subject: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )
    payload = {"sub": subject, "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def register(db: Session, data: UserCreate) -> User:
    existing = user_repository.get_by_email(db, data.email)
    if existing:
        raise ValueError("Email already registered")
    hashed = pwd_context.hash(data.password)
    return user_repository.create(db, data.email, hashed, data.full_name)


def authenticate(db: Session, email: str, password: str) -> User:
    user = user_repository.get_by_email(db, email)
    if not user or not pwd_context.verify(password, user.hashed_password):
        raise ValueError("Incorrect email or password")
    return user


def update_profile(db: Session, user: User, data: UserUpdate) -> User:
    if data.full_name is None and data.new_password is None:
        raise ValueError("At least one field must be provided")
    if data.new_password is not None:
        if not data.current_password:
            raise ValueError("Current password is required to set a new password")
        if not pwd_context.verify(data.current_password, user.hashed_password):
            raise ValueError("Current password is incorrect")
    hashed = pwd_context.hash(data.new_password) if data.new_password else None
    return user_repository.update(
        db, user, full_name=data.full_name, hashed_password=hashed
    )
