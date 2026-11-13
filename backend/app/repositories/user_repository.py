from typing import Optional
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from backend.app.models import User, RefreshToken
from backend.app.repositories.base_repository import BaseRepository

class UserRepository(BaseRepository[User]):
    def __init__(self, db: Session):
        super().__init__(User, db)

    def get_by_email(self, email: str) -> Optional[User]:
        return self.db.query(User).filter(User.email == email).first()

    def get_refresh_token(self, token_hash: str) -> Optional[RefreshToken]:
        return self.db.query(RefreshToken).filter(RefreshToken.token_hash == token_hash).first()

    def store_refresh_token(self, rt: RefreshToken) -> RefreshToken:
        self.db.add(rt)
        self.db.commit()
        return rt

    def revoke_user_refresh_tokens(self, user_id: str) -> None:
        now_utc = datetime.now(timezone.utc)
        self.db.query(RefreshToken).filter(
            RefreshToken.user_id == user_id,
            RefreshToken.is_revoked == False
        ).update({"is_revoked": True, "revoked_at": now_utc})
        self.db.commit()
