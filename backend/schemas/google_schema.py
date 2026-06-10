from pydantic import BaseModel


class GoogleAuthRequest(BaseModel):
    access_token: str
