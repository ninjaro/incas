"""Small allow-list HTML sanitizer for authored public post bodies.

Site-content pages are committed source code, but post bodies are admin input
and therefore cross a trust boundary. Keeping this sanitizer local avoids
shipping unsanitized HTML while retaining the simple formatting editors use.
"""

from html import escape
from html.parser import HTMLParser
from urllib.parse import urlparse


ALLOWED_TAGS = {
    "a",
    "blockquote",
    "br",
    "code",
    "em",
    "h2",
    "h3",
    "h4",
    "hr",
    "li",
    "ol",
    "p",
    "pre",
    "strong",
    "ul",
}
VOID_TAGS = {"br", "hr"}
BLOCKED_CONTENT_TAGS = {"iframe", "object", "script", "style", "svg"}
ALLOWED_PROTOCOLS = {"", "http", "https", "mailto", "tel"}


class _RichHtmlSanitizer(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts = []
        self.blocked_depth = 0

    def handle_starttag(self, tag, attrs):
        tag = tag.lower()
        if tag in BLOCKED_CONTENT_TAGS:
            self.blocked_depth += 1
            return
        if self.blocked_depth or tag not in ALLOWED_TAGS:
            return

        clean_attrs = []
        if tag == "a":
            values = {name.lower(): value for name, value in attrs if value is not None}
            href = values.get("href", "").strip()
            if href and urlparse(href).scheme.lower() in ALLOWED_PROTOCOLS:
                clean_attrs.append(("href", href))
            if values.get("title"):
                clean_attrs.append(("title", values["title"]))
            if values.get("target") == "_blank":
                clean_attrs.extend((("target", "_blank"), ("rel", "noopener noreferrer")))

        rendered_attrs = "".join(
            f' {name}="{escape(value, quote=True)}"' for name, value in clean_attrs
        )
        self.parts.append(f"<{tag}{rendered_attrs}>")

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)

    def handle_endtag(self, tag):
        tag = tag.lower()
        if tag in BLOCKED_CONTENT_TAGS:
            self.blocked_depth = max(self.blocked_depth - 1, 0)
            return
        if not self.blocked_depth and tag in ALLOWED_TAGS and tag not in VOID_TAGS:
            self.parts.append(f"</{tag}>")

    def handle_data(self, data):
        if not self.blocked_depth:
            self.parts.append(escape(data))


def sanitize_rich_html(value):
    parser = _RichHtmlSanitizer()
    parser.feed(value or "")
    parser.close()
    return "".join(parser.parts)
