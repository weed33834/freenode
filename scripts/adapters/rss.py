"""rss 适配器：抓 RSS/Atom feed，提取 item/entry 的正文文本。

用标准库 xml.etree.ElementTree 解析，处理 ``content:encoded`` 这类带命名空间的标签。
"""

from __future__ import annotations

import xml.etree.ElementTree as ET

from utils import validate_url

# item/entry 里这些 local name 视为正文（content:encoded 的 local name 是 encoded）
_CONTENT_LOCALS = frozenset({"description", "encoded", "summary", "content"})


def _localname(tag: str) -> str:
    """剥掉命名空间，返回 local name。"""
    return tag.split("}", 1)[1] if "}" in tag else tag


def parse_feed(xml_text: str) -> str:
    """解析 RSS/Atom XML，返回 entry 正文拼成的字符串（每条之间换行）。"""
    root = ET.fromstring(xml_text)
    chunks: list[str] = []
    for el in root.iter():
        if _localname(el.tag) not in ("item", "entry"):
            continue
        parts: list[str] = []
        for child in el:
            if _localname(child.tag) in _CONTENT_LOCALS and child.text:
                parts.append(child.text)
        if parts:
            chunks.append("\n".join(parts))
    return "\n".join(chunks)


class RssAdapter:
    """rss 源：抓 feed XML，提取所有 item/entry 正文。"""

    @property
    def source_type(self) -> str:
        return "rss"

    def fetch(self, source: dict) -> str:
        validate_url(source["url"])
        import crawler

        xml_text = crawler.fetch(
            source["url"],
            timeout=source.get("timeout", 20),
            max_bytes=source.get("max_size", 10 * 1024 * 1024),
        )
        return parse_feed(xml_text)
