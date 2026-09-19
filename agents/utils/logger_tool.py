import logging
import os
from datetime import datetime
from utils.path_tool import get_abs_path

LOG_ROOT = get_abs_path('logs')
os.makedirs(LOG_ROOT, exist_ok=True)
DEFAULT_FORMATTER = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s -%(filename)s:%(lineno)d - %(message)s')
def get_logger(
        logger_name='agent',
        console_level=logging.INFO,
        file_level=logging.DEBUG,
        logger_file=None
    ):
    logger = logging.getLogger(logger_name)
    logger.setLevel(logging.DEBUG)
    if logger.handlers:
        return logger
    # 控制台
    console_handler = logging.StreamHandler()
    console_handler.setLevel(console_level)
    console_handler.setFormatter(DEFAULT_FORMATTER)
    logger.addHandler(console_handler)

    # 文件
    if not logger_file:
        logger_file = os.path.join(LOG_ROOT, f'{logger_name}_{datetime.now().strftime("%Y%m%d")}.log')
    file_handler = logging.FileHandler(logger_file, encoding='utf-8')
    file_handler.setLevel(file_level)
    file_handler.setFormatter(DEFAULT_FORMATTER)
    logger.addHandler(file_handler)

    return logger

logger = get_logger()

if __name__ == '__main__':
    logger = get_logger()
    logger.debug('debug')
    logger.info('info')
    logger.warning('warning')
    logger.error('error')