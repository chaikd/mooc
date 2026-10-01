from typing import Any, Optional

class DomainException(Exception):
    def __init__(
        self,
        message: str,
        code: Optional[str] = None,
        *,
        status_code: int = 400,
        details: Any = None,
    ):
        self.message = message
        self.code = code or "DOMAIN_ERROR"
        self.status_code = status_code
        self.details = details
        super().__init__(message)

class NotFoundError(DomainException):
    def __init__(self, message = "查找的数据不存在"):
        super().__init__(
            message,
            "NOT_FOUND_ERROR",
            status_code=404,
        )

class LLMRequestError(DomainException):
    def __init__(self, message = "模型请求失败"):
        super().__init__(
            message,
            "LLM_REQUEST_ERROR",
            status_code=503,
        )
