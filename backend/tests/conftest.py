import os
from typing import Generator

# Must be set before any app module is imported, since database.py and
# services/user_service.py read these at module level.
os.environ["DATABASE_URL"] = "sqlite://"
os.environ.setdefault("SECRET_KEY", "test-secret-key-for-testing-only")

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from database import Base, get_db
from main import app

# StaticPool ensures all sessions share the same in-memory SQLite connection.
_engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
_SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=_engine)


@pytest.fixture
def reset_db() -> Generator[None, None, None]:
    Base.metadata.create_all(bind=_engine)
    yield
    Base.metadata.drop_all(bind=_engine)


@pytest.fixture
def db(reset_db: None) -> Generator[Session, None, None]:
    session = _SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client(reset_db: None) -> Generator[TestClient, None, None]:
    def _override_get_db() -> Generator[Session, None, None]:
        session = _SessionLocal()
        try:
            yield session
        except SQLAlchemyError:
            session.rollback()
            raise
        finally:
            session.close()

    app.dependency_overrides[get_db] = _override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
