# Re-export database infrastructure from backend.app.database for backward compatibility
from backend.app.database.base import Base
from backend.app.database.session import engine, SessionLocal, get_db

__all__ = ["Base", "engine", "SessionLocal", "get_db"]
