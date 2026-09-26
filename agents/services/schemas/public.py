from enum import Enum

class DataStatus(str, Enum):
    DELETED = 'deleted'
    INACTIVE = 'inactive'
    ACTIVE = 'active'

class MasteryState(str, Enum):
    NOT_CONTACTED = '未接触'
    CONTACTED = '已接触'
    UNKNOWN = '理解程度未知'
    INITIAL_MASTERY = '初步掌握'
    STABLE_MASTERY = '稳定掌握'
    TRANSFER_MASTERY = '迁移掌握'

    @classmethod
    def values(cls) -> list[str]:
        """返回所有合法取值，供建表 SQL 生成 CHECK 约束时复用。"""
        return [member.value for member in cls]

class ChatRole(str, Enum):
    USER = 'user'
    ASSISTANT = 'assistant'
    THINKING = 'thinking'

class SSEType(str, Enum):
    META = 'meta'
    TOKEN = 'token'
    QUESTION = 'question'
    END = 'end'
    ERROR = 'error'