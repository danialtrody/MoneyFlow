import os

from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from routers import accounts, ai, auth, categories, google_auth, import_router, transactions

load_dotenv()

app = FastAPI()

_raw_origins = os.getenv("FRONTEND_URL", "http://localhost:5173")
_allowed_origins = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    _request: Request, exc: RequestValidationError
) -> JSONResponse:
    messages = []
    for error in exc.errors():
        field = error["loc"][-1] if error["loc"] else "field"
        msg = error["msg"].replace("Value error, ", "")
        messages.append(f"{field}: {msg}")
    return JSONResponse(
        status_code=422,
        content={"detail": messages},
    )


app.include_router(auth.router)
app.include_router(google_auth.router)
app.include_router(accounts.router)
app.include_router(transactions.router)
app.include_router(categories.router)
app.include_router(import_router.router)
app.include_router(ai.router)


@app.get("/health")
def health() -> JSONResponse:
    return JSONResponse(status_code=200, content={"status": "ok"})


_frontend_dist = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), '..', 'frontend', 'dist'
)
if os.path.exists(_frontend_dist):
    app.mount('/', StaticFiles(directory=_frontend_dist, html=True), name='frontend')
