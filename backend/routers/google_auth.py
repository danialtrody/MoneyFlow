import json
import urllib.error
import urllib.request

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from cookie_utils import set_auth_cookie
from database import get_db
from schemas.google_schema import GoogleAuthRequest
from schemas.user import UserResponse
from services import user_service

router = APIRouter(tags=["auth"])

_GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"


@router.post("/auth/google", response_model=UserResponse)
def google_login(
    data: GoogleAuthRequest,
    response: Response,
    db: Session = Depends(get_db),
) -> UserResponse:
    req = urllib.request.Request(
        _GOOGLE_USERINFO_URL,
        headers={"Authorization": f"Bearer {data.access_token}"},
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as res:
            info: dict = json.loads(res.read().decode())
    except urllib.error.HTTPError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired Google token",
        )
    except (urllib.error.URLError, OSError, TimeoutError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not verify Google token",
        )

    google_id: str = info.get("sub", "")
    email: str = info.get("email", "")
    full_name: str = info.get("name", "") or (email.split("@")[0] if email else "")

    if not email or not google_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google account must have an email address",
        )

    user = user_service.get_or_create_from_google(db, google_id, email, full_name)
    token = user_service.create_access_token(subject=user.email)
    set_auth_cookie(response, token)
    return UserResponse.model_validate(user)
