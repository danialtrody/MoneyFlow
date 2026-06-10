import os

from fastapi import Response

_COOKIE_SECURE: bool = os.getenv("COOKIE_SECURE", "false").lower() == "true"
_COOKIE_SAMESITE: str = "none" if _COOKIE_SECURE else "lax"
_COOKIE_MAX_AGE: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30")) * 60


def set_auth_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        samesite=_COOKIE_SAMESITE,
        secure=_COOKIE_SECURE,
        max_age=_COOKIE_MAX_AGE,
    )
