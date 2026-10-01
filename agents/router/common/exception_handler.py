import logging
from typing import Any

from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from router.common.exception import DomainException

logger = logging.getLogger(__name__)


def build_error_payload(
    *,
    code: str,
    message: str,
    details: Any = None,
) -> dict[str, Any]:
    """构造普通接口 SSE 共用的错误载荷。"""
    return jsonable_encoder(
        {
            "success": False,
            "code": code,
            "message": message,
            "details": details,
        }
    )


def register_exception_handlers(app: FastAPI) -> None:
    """注册全局异常处理器，统一普通 HTTP 接口的错误响应。"""

    @app.exception_handler(DomainException)
    async def handle_domain_exception(
        _request: Request,
        exc: DomainException,
    ) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content=build_error_payload(
                code=exc.code,
                message=exc.message,
                details=exc.details,
            ),
        )

    @app.exception_handler(RequestValidationError)
    async def handle_validation_exception(
        _request: Request,
        exc: RequestValidationError,
    ) -> JSONResponse:
        return JSONResponse(
            status_code=422,
            content=build_error_payload(
                code="VALIDATION_ERROR",
                message="请求参数校验失败",
                details=exc.errors(),
            ),
        )

    @app.exception_handler(StarletteHTTPException)
    async def handle_http_exception(
        _request: Request,
        exc: StarletteHTTPException,
    ) -> JSONResponse:
        message = exc.detail if isinstance(exc.detail, str) else "请求失败"
        return JSONResponse(
            status_code=exc.status_code,
            content=build_error_payload(
                code=f"HTTP_{exc.status_code}",
                message=message,
                details=None if isinstance(exc.detail, str) else exc.detail,
            ),
        )

    @app.exception_handler(Exception)
    async def handle_unexpected_exception(
        request: Request,
        exc: Exception,
    ) -> JSONResponse:
        logger.exception(
            "Unhandled exception: method=%s path=%s",
            request.method,
            request.url.path,
            exc_info=exc,
        )
        return JSONResponse(
            status_code=500,
            content=build_error_payload(
                code="INTERNAL_ERROR",
                message="服务器内部错误",
            ),
        )
