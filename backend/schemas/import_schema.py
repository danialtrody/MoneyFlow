from pydantic import BaseModel


class RowError(BaseModel):
    row: int
    reason: str


class ImportResponse(BaseModel):
    imported: int
    skipped: int
    errors: list[RowError]
