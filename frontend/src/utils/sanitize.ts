const ALLOWED_TAGS = new Set([
  "A", "BLOCKQUOTE", "BR", "CODE", "EM", "H2", "H3", "H4", "HR",
  "LI", "OL", "P", "PRE", "STRONG", "UL",
]);
const BLOCKED_TAGS = new Set(["IFRAME", "OBJECT", "SCRIPT", "STYLE", "SVG"]);
const ALLOWED_PROTOCOLS = new Set(["", "http:", "https:", "mailto:", "tel:"]);

/** Demo equivalent of the server sanitizer used by the production preview. */
export function sanitizeRichHtml(value: string): string {
  const documentNode = new DOMParser().parseFromString(value, "text/html");

  const clean = (node: Node): Node | null => {
    if (node.nodeType === Node.TEXT_NODE) return document.createTextNode(node.textContent ?? "");
    if (!(node instanceof Element) || BLOCKED_TAGS.has(node.tagName)) return null;
    const children = [...node.childNodes]
      .map(clean)
      .filter((child): child is Node => child !== null);
    if (!ALLOWED_TAGS.has(node.tagName)) {
      const fragment = document.createDocumentFragment();
      children.forEach((child) => fragment.append(child));
      return fragment;
    }

    const element = document.createElement(node.tagName.toLowerCase());
    if (node.tagName === "A") {
      const href = node.getAttribute("href")?.trim() ?? "";
      let protocol = "";
      try {
        protocol = href ? new URL(href, window.location.origin).protocol : "";
      } catch {
        protocol = "invalid:";
      }
      if (href && ALLOWED_PROTOCOLS.has(protocol)) element.setAttribute("href", href);
      const title = node.getAttribute("title");
      if (title) element.setAttribute("title", title);
      if (node.getAttribute("target") === "_blank") {
        element.setAttribute("target", "_blank");
        element.setAttribute("rel", "noopener noreferrer");
      }
    }
    children.forEach((child) => element.append(child));
    return element;
  };

  const container = document.createElement("div");
  [...documentNode.body.childNodes]
    .map(clean)
    .filter((node): node is Node => node !== null)
    .forEach((node) => container.append(node));
  return container.innerHTML;
}
