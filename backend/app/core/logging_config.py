"""结构化日志配置。生产用 JSON，开发用人类可读格式。"""

from __future__ import annotations

import json
import logging
from datetime import UTC, datetime


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        # 一行一条 JSON，方便日志采集器直接收
        payload: dict[str, object] = {
            "time": datetime.fromtimestamp(record.created, tz=UTC).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "msg": record.getMessage(),
        }
        # 异常堆栈单独放 exception 字段，避免 logger.exception() 的堆栈丢失
        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)
        return json.dumps(payload, ensure_ascii=False)


def setup_logging(debug: bool = False) -> None:
    # 替换 root logger 的 handler，避免 basicConfig 留下的纯文本格式
    handler = logging.StreamHandler()
    if debug:
        handler.setFormatter(logging.Formatter("%(levelname)s [%(name)s] %(message)s"))
    else:
        handler.setFormatter(JsonFormatter())
    root = logging.getLogger()
    root.handlers = [handler]
    root.setLevel(logging.DEBUG if debug else logging.INFO)
