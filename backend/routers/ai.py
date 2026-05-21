import json
from collections.abc import Generator

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from database import get_db
from dependencies import get_current_user
from models.user import User
from schemas.ai_schema import ChatRequest
from services import ai_service

router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/chat")
def chat(
    request: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> StreamingResponse:
    def generate() -> Generator[str, None, None]:
        try:
            for chunk in ai_service.stream_chat(
                db,
                current_user.id,
                request.message,
                request.history,
                request.period_days,
            ):
                yield f"data: {json.dumps(chunk)}\n\n"
        except ValueError as e:
            yield f"data: {json.dumps('[ERROR] ' + str(e))}\n\n"
            yield f"data: {json.dumps('[DONE]')}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
