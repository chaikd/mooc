import secrets
from typing import Annotated

from fastapi import Depends, Header, HTTPException

from config.settings import settings


def get_current_user_id(
    x_user_id: Annotated[str | None, Header(alias="X-User-Id")] = None,
    x_internal_secret: Annotated[str | None, Header(alias="X-Internal-Secret")] = None,
) -> str:
    """从 Node 代理注入的内部请求头中获取当前用户。"""
    expected_secret = settings.INTERNAL_API_SECRET
    if not expected_secret:
        raise HTTPException(status_code=500, detail="内部鉴权密钥未配置")
    if not x_internal_secret or not secrets.compare_digest(
        x_internal_secret,
        expected_secret,
    ):
        raise HTTPException(status_code=401, detail="内部鉴权失败")
    if not x_user_id:
        raise HTTPException(status_code=401, detail="缺少用户身份")
    return x_user_id


CurrentUserId = Annotated[str, Depends(get_current_user_id)]
