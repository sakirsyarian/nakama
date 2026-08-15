import { describe, expect, test } from "bun:test";
import {
  extractMarkdownToc,
  headingTextFromChildren,
  slugifyMarkdownHeading,
  stripMarkdownInline,
  uniqueMarkdownHeadingId,
} from "./markdown-toc";

describe("extractMarkdownToc", () => {
  test("collects atx headings and skips fenced code", () => {
    const toc = extractMarkdownToc(`# Script

Intro.

## BAGIAN 1 — HOOK

Body.

\`\`\`
## not a heading
\`\`\`

### Visual

## BAGIAN 2
`);

    expect(toc.map((entry) => entry.text)).toEqual([
      "Script",
      "BAGIAN 1 — HOOK",
      "Visual",
      "BAGIAN 2",
    ]);
    expect(toc.map((entry) => entry.level)).toEqual([1, 2, 3, 2]);
  });

  test("returns nothing when there are no headings", () => {
    expect(extractMarkdownToc("Just a paragraph.\n\n**Bold line**")).toEqual(
      []
    );
  });

  test("makes duplicate heading ids unique", () => {
    const toc = extractMarkdownToc("## Hook\n\n## Hook\n");
    expect(toc.map((entry) => entry.id)).toEqual(["hook", "hook-2"]);
    expect(toc.map((entry) => entry.slug)).toEqual(["hook", "hook"]);
    expect(toc.map((entry) => entry.occurrence)).toEqual([0, 1]);
  });

  test("includes h4 subtitles and setext headings", () => {
    const toc = extractMarkdownToc(`Script
=====

## BAGIAN 1

### Visual

#### Notes
`);

    expect(toc.map((entry) => entry.text)).toEqual([
      "Script",
      "BAGIAN 1",
      "Visual",
      "Notes",
    ]);
    expect(toc.map((entry) => entry.level)).toEqual([1, 2, 3, 4]);
  });
});

describe("slugifyMarkdownHeading", () => {
  test("keeps indonesian letters and strips punctuation", () => {
    expect(slugifyMarkdownHeading("BAGIAN 1 — HOOK (0:00–0:45)")).toBe(
      "bagian-1-hook-0-00-0-45"
    );
  });
});

describe("uniqueMarkdownHeadingId", () => {
  test("increments the suffix after the first use", () => {
    const used = new Map<string, number>();
    expect(uniqueMarkdownHeadingId("Intro", used)).toBe("intro");
    expect(uniqueMarkdownHeadingId("Intro", used)).toBe("intro-2");
  });
});

describe("stripMarkdownInline", () => {
  test("drops emphasis and link markup", () => {
    expect(stripMarkdownInline("**HOOK** and [VO](https://x.test)")).toBe(
      "HOOK and VO"
    );
  });
});

describe("headingTextFromChildren", () => {
  test("flattens nested react children", () => {
    expect(
      headingTextFromChildren(["BAGIAN 1 — ", { props: { children: "HOOK" } }])
    ).toBe("BAGIAN 1 — HOOK");
  });
});
