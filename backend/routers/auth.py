import os

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from database import get_db
from dependencies import get_current_user
from models.user import User
from schemas.user import LoginRequest, UserCreate, UserResponse
from services import user_service

router = APIRouter(prefix="/auth", tags=["auth"])

_COOKIE_SECURE: bool = os.getenv("COOKIE_SECURE", "false").lower() == "true"
_COOKIE_SAMESITE: str = "none" if _COOKIE_SECURE else "lax"
_COOKIE_MAX_AGE: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30")) * 60


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
def register(
    data: UserCreate,
    db: Session = Depends(get_db),
) -> UserResponse:
    try:
        user = user_service.register(db, data)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    return UserResponse.model_validate(user)


@router.post("/login", response_model=UserResponse)
def login(
    data: LoginRequest,
    response: Response,
    db: Session = Depends(get_db),
) -> UserResponse:
    try:
        user = user_service.authenticate(db, data.email, data.password)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = user_service.create_access_token(subject=user.email)
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        samesite=_COOKIE_SAMESITE,
        secure=_COOKIE_SECURE,
        max_age=_COOKIE_MAX_AGE,
    )
    return UserResponse.model_validate(user)


@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)) -> UserResponse:
    return UserResponse.model_validate(current_user)


@router.post("/logout", response_model=dict[str, str])
def logout(response: Response) -> dict[str, str]:
    response.delete_cookie(key="access_token")
    return {"message": "logout successful"}
