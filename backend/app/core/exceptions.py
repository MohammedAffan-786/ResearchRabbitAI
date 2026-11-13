from typing import Any, Optional, Dict

class AppException(Exception):
    """Base application exception with error code and optional details."""
    def __init__(
        self,
        message: str,
        code: str = "INTERNAL_ERROR",
        status_code: int = 500,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = details or {}

class EntityNotFoundException(AppException):
    def __init__(self, entity_name: str, identifier: Any):
        super().__init__(
            message=f"{entity_name} with identifier '{identifier}' was not found.",
            code="ENTITY_NOT_FOUND",
            status_code=404,
            details={"entity": entity_name, "identifier": identifier}
        )

class DuplicateEntityException(AppException):
    def __init__(self, entity_name: str, field: str, value: Any):
        super().__init__(
            message=f"{entity_name} with {field} '{value}' already exists.",
            code="DUPLICATE_ENTITY",
            status_code=409,
            details={"entity": entity_name, "field": field, "value": value}
        )

class AuthenticationException(AppException):
    def __init__(self, message: str = "Invalid authentication credentials"):
        super().__init__(
            message=message,
            code="AUTHENTICATION_FAILED",
            status_code=401,
            details={}
        )

class AuthorizationException(AppException):
    def __init__(self, message: str = "Not authorized to access this resource"):
        super().__init__(
            message=message,
            code="ACCESS_DENIED",
            status_code=403,
            details={}
        )

class ValidationException(AppException):
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            code="VALIDATION_ERROR",
            status_code=422,
            details=details or {}
        )

class RateLimitExceededException(AppException):
    def __init__(self, retry_after: int = 60):
        super().__init__(
            message=f"Rate limit exceeded. Please retry after {retry_after} seconds.",
            code="RATE_LIMIT_EXCEEDED",
            status_code=429,
            details={"retry_after": retry_after}
        )

class InvalidFileException(AppException):
    def __init__(self, message: str):
        super().__init__(
            message=message,
            code="INVALID_FILE",
            status_code=400,
            details={}
        )
