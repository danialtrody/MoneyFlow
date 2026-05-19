from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy.orm import Session

from database import get_db
from dependencies import get_current_user
from models.user import User
from schemas.import_schema import ImportResponse
from services import import_service

router = APIRouter(prefix="/import", tags=["import"])

_MAX_SIZE = 5 * 1024 * 1024
_ALLOWED_EXTENSIONS = {".csv", ".xls"}


@router.post("/transactions", response_model=ImportResponse)
async def import_transactions(
    account_id: int = Query(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ImportResponse:
    filename = file.filename or ""
    ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in _ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only .csv and .xls files are supported.",
        )

    content = await file.read()
    if len(content) > _MAX_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
            detail="File exceeds the 5 MB limit.",
        )

    try:
        return import_service.import_transactions(db, current_user.id, account_id, content)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
