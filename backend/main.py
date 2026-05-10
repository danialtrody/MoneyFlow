import os
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import create_engine, text

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DATABASE_URL = os.getenv("DATABASE_URL")


@app.get("/health-db")
def health_db():
    if not DATABASE_URL:
        return JSONResponse(status_code=500, content={"status": "error", "detail": "DATABASE_URL is not set"})
    try:
        engine = create_engine(DATABASE_URL)
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return JSONResponse(status_code=200, content={"status": "DB connected successfully"})
    except Exception as exc:
        return JSONResponse(status_code=500, content={"status": "error", "detail": str(exc)})
