export const MARKDOWN_TOC_MIN_HEADINGS = 2;
export const MARKDOWN_HEADING_ATTR = "data-artifact-heading";

export interface MarkdownTocEntry {
  id: string;
  level: 1 | 2 | 3 | 4;
  occurrence: number;
  slug: string;
  text: string;
}

const ATX_HEADING = /^(#{1,4})\s+(.+?)\s*#*\s*$/;
const FENCE_OPEN = /^(```|~~~)/;
const SETEXT_H1 = /^=+$/;
const SETEXT_H2 = /^-{3,}$/;

export function slugifyMarkdownHeading(text: string): string {
  const slug = text
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "section";
}

export function uniqueMarkdownHeadingId(
  text: string,
  used: Map<string, number>
): string {
  const base = slugifyMarkdownHeading(text);
  const count = used.get(base) ?? 0;
  used.set(base, count + 1);

  if (count === 0) {
    return base;
  }

  return `${base}-${count + 1}`;
}

export function stripMarkdownInline(value: string): string {
  return value
    .replace(/!\[[^\]]*]\([^)]*\)/g, "")
    .replace(/\[([^\]]*)]\([^)]*\)/g, "$1")
    .replace(/[*_~`]+/g, "")
    .replace(/\\([\\`*_[\]()#+.!-])/g, "$1")
    .trim();
}

export function normalizeMarkdownHeadingText(value: string): string {
  return stripMarkdownInline(value).replace(/\s+/g, " ").trim();
}

function pushTocEntry(
  entries: MarkdownTocEntry[],
  used: Map<string, number>,
  level: MarkdownTocEntry["level"],
  rawText: string
) {
  const text = normalizeMarkdownHeadingText(rawText);
  if (!text) {
    return;
  }

  const slug = slugifyMarkdownHeading(text);
  const occurrence = used.get(slug) ?? 0;
  used.set(slug, occurrence + 1);
  entries.push({
    id: occurrence === 0 ? slug : `${slug}-${occurrence + 1}`,
    level,
    occurrence,
    slug,
    text,
  });
}

export function extractMarkdownToc(markdown: string): MarkdownTocEntry[] {
  const used = new Map<string, number>();
  const entries: MarkdownTocEntry[] = [];
  let inFence = false;
  const lines = markdown.split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    const trimmed = line.trim();

    if (FENCE_OPEN.test(trimmed)) {
      inFence = !inFence;
      continue;
    }

    if (inFence) {
      continue;
    }

    const atx = ATX_HEADING.exec(trimmed);
    if (atx) {
      const hashes = atx[1];
      const rawText = atx[2];
      if (hashes && rawText != null) {
        pushTocEntry(
          entries,
          used,
          hashes.length as MarkdownTocEntry["level"],
          rawText
        );
      }
      continue;
    }

    const next = lines[index + 1]?.trim() ?? "";
    if (!(trimmed && next) || trimmed.startsWith("#")) {
      continue;
    }

    if (SETEXT_H1.test(next)) {
      pushTocEntry(entries, used, 1, trimmed);
      index += 1;
      continue;
    }

    if (SETEXT_H2.test(next)) {
      pushTocEntry(entries, used, 2, trimmed);
      index += 1;
    }
  }

  return entries;
}

export function headingTextFromChildren(children: unknown): string {
  if (typeof children === "string" || typeof children === "number") {
    return String(children);
  }

  if (Array.isArray(children)) {
    return children.map((child) => headingTextFromChildren(child)).join("");
  }

  if (
    children &&
    typeof children === "object" &&
    "props" in children &&
    children.props &&
    typeof children.props === "object" &&
    "children" in children.props
  ) {
    return headingTextFromChildren(children.props.children);
  }

  return "";
}

export function queryMarkdownHeading(
  root: ParentNode,
  entry: Pick<MarkdownTocEntry, "occurrence" | "slug">
): HTMLElement | null {
  const nodes = root.querySelectorAll(
    `[${MARKDOWN_HEADING_ATTR}="${CSS.escape(entry.slug)}"]`
  );
  const node = nodes[entry.occurrence];
  return node instanceof HTMLElement ? node : null;
}

export function scrollMarkdownHeadingIntoView(
  entry: Pick<MarkdownTocEntry, "occurrence" | "slug">
) {
  const panel = document.querySelector("[data-slot='attachment-detail-panel']");
  const heading = queryMarkdownHeading(panel ?? document, entry);
  if (!heading) {
    return;
  }

  const scroller = heading.closest("[data-artifact-panel-scroll]");
  if (scroller instanceof HTMLElement) {
    const offset =
      heading.getBoundingClientRect().top -
      scroller.getBoundingClientRect().top +
      scroller.scrollTop;
    scroller.scrollTo({ behavior: "smooth", top: Math.max(0, offset - 12) });
    return;
  }

  heading.scrollIntoView({ behavior: "smooth", block: "start" });
}
