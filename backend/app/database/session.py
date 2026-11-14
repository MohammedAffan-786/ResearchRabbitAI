import os
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from backend.app.core.config import settings
from backend.app.database.base import Base

db_url = settings.DATABASE_URL
connect_args = {}
if db_url.startswith("sqlite:///./") or db_url == "sqlite:///researchrabbit.db":
    backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    db_path = os.path.join(backend_dir, "researchrabbit.db").replace("\\", "/")
    db_url = f"sqlite:///{db_path}"
    connect_args = {"check_same_thread": False, "timeout": 30}
elif db_url.startswith("sqlite"):
    connect_args = {"check_same_thread": False, "timeout": 30}

engine = create_engine(
    db_url,
    connect_args=connect_args,
    pool_pre_ping=True
)

@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    if db_url.startswith("sqlite"):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA busy_timeout=10000")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
