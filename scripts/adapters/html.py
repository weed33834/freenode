"""html 适配器：抓 HTML 页面，按简易 selector 提取 <pre>/<code> 文本。

不引入 lxml/selectolax，用标准库 html.parser 凑一个够用的解析器：
支持 ``tag`` / ``tag.class`` / ``#id`` / ``tag attr=value`` 这几种 selector。
"""

from __future__ import annotations

from html.parser import HTMLParser

from utils import validate_url

# void 元素不进栈，避免把 <br> 当成未闭合标签
_VOID_TAGS = frozenset(
    {
        "area",
        "base",
        "br",
        "col",
        "embed",
        "hr",
        "img",
        "input",
        "link",
        "meta",
        "param",
        "source",
        "track",
        "wbr",
    }
)


class _Element:
    """简易 DOM 节点，只记 tag/attrs/子节点/直接文本片段。"""

    __slots__ = ("tag", "attrs", "children", "text_parts")

    def __init__(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        self.tag = tag
        self.attrs = {k: (v or "") for k, v in attrs}
        self.children: list[_Element] = []
        self.text_parts: list[str] = []

    def get_text(self) -> str:
        """递归收集自己 + 后代的全部文本。"""
        parts = list(self.text_parts)
        for child in self.children:
            parts.append(child.get_text())
        return "".join(parts)


class _TreeBuilder(HTMLParser):
    """把 HTML 解析成 _Element 树，容忍未闭合标签。"""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.root = _Element("#root", [])
        self.stack: list[_Element] = [self.root]

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        el = _Element(tag, attrs)
        self.stack[-1].children.append(el)
        if tag not in _VOID_TAGS:
            self.stack.append(el)

    def handle_startendtag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        # <img /> 这类自闭合，加完不入栈
        self.stack[-1].children.append(_Element(tag, attrs))

    def handle_endtag(self, tag: str) -> None:
        # 弹到最近同名标签，容忍中间没闭合的
        for i in range(len(self.stack) - 1, 0, -1):
            if self.stack[i].tag == tag:
                del self.stack[i:]
                break

    def handle_data(self, data: str) -> None:
        self.stack[-1].text_parts.append(data)


def _parse_selector(
    selector: str,
) -> tuple[str | None, str | None, str | None, dict[str, str]]:
    """解析简易 selector，返回 (tag, class, id, attr_filters)。

    支持: ``tag`` / ``tag.class`` / ``#id`` / ``tag attr=value``
    """
    parts = selector.strip().split()
    main = parts[0] if parts else ""
    attr_filters: dict[str, str] = {}
    for p in parts[1:]:
        if "=" in p:
            k, v = p.split("=", 1)
            attr_filters[k.strip()] = v.strip().strip("\"'")
    tag: str | None = None
    cls: str | None = None
    id_: str | None = None
    if main.startswith("#"):
        id_ = main[1:]
    elif "." in main:
        tag, cls = main.split(".", 1)
    elif main:
        tag = main
    return tag, cls, id_, attr_filters


def _matches(
    el: _Element,
    tag: str | None,
    cls: str | None,
    id_: str | None,
    attr_filters: dict[str, str],
) -> bool:
    if tag and el.tag != tag:
        return False
    if cls and cls not in el.attrs.get("class", "").split():
        return False
    if id_ and el.attrs.get("id") != id_:
        return False
    return all(el.attrs.get(k) == v for k, v in attr_filters.items())


def _iter_all(root: _Element) -> list[_Element]:
    """前序遍历，返回所有非根节点。"""
    out: list[_Element] = []

    def walk(node: _Element) -> None:
        for child in node.children:
            out.append(child)
            walk(child)

    walk(root)
    return out


def extract(html_text: str, selector: str | None = None) -> str:
    """从 HTML 提取 selector 指向的元素文本。

    selector 为 None 时默认抓所有 ``<pre>`` 和 ``<code>``。
    """
    builder = _TreeBuilder()
    builder.feed(html_text)
    builder.close()

    all_elements = _iter_all(builder.root)
    if selector:
        tag, cls, id_, attr_filters = _parse_selector(selector)
        matched = [el for el in all_elements if _matches(el, tag, cls, id_, attr_filters)]
    else:
        matched = [el for el in all_elements if el.tag in ("pre", "code")]

    return "\n".join(el.get_text().strip() for el in matched if el.get_text().strip())


class HtmlAdapter:
    """html 源：抓 HTML，按 selector 提取 ``<pre>``/``<code>`` 块文本。"""

    @property
    def source_type(self) -> str:
        return "html"

    def fetch(self, source: dict) -> str:
        validate_url(source["url"])
        import crawler

        html_text = crawler.fetch(
            source["url"],
            timeout=source.get("timeout", 20),
            max_bytes=source.get("max_size", 10 * 1024 * 1024),
        )
        return extract(html_text, source.get("selector"))
