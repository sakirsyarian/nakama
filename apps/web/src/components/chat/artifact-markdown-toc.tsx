import { ArrowDown01Icon, ListViewIcon } from "hugeicons-react";
import { type RefObject, useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  findHeadingElement,
  MARKDOWN_TOC_MIN_HEADINGS,
  type MarkdownHeading,
} from "@/lib/markdown-toc";
import { cn } from "@/lib/utils";

const LEVEL_INDENT: Record<number, string> = {
  1: "pl-0",
  2: "pl-3",
  3: "pl-6",
};

export function ArtifactMarkdownToc({
  contentRef,
  headings,
}: {
  contentRef: RefObject<HTMLElement | null>;
  headings: MarkdownHeading[];
}) {
  if (headings.length < MARKDOWN_TOC_MIN_HEADINGS) {
    return null;
  }

  return (
    <details
      className="group rounded-lg border border-border bg-muted/40 px-3 py-2"
      open
    >
      <summary className="flex cursor-pointer list-none items-center gap-1.5 font-medium text-muted-foreground text-xs [&::-webkit-details-marker]:hidden">
        <ArrowDown01Icon
          aria-hidden
          className="size-3.5 -rotate-90 transition-transform group-open:rotate-0"
        />
        Contents
      </summary>
      <nav aria-label="Table of contents" className="mt-2">
        <ul className="space-y-0.5">
          {headings.map((heading) => (
            <li
              className={LEVEL_INDENT[heading.level]}
              key={`${heading.level}-${heading.occurrence}-${heading.text}`}
            >
              <button
                className={cn(
                  "block w-full truncate rounded px-1 py-0.5 text-left text-muted-foreground text-xs transition-colors hover:bg-muted hover:text-foreground",
                  heading.level === 1 && "font-medium text-foreground"
                )}
                onClick={() =>
                  findHeadingElement(
                    contentRef.current,
                    heading
                  )?.scrollIntoView({ behavior: "smooth", block: "start" })
                }
                type="button"
              >
                {heading.text}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </details>
  );
}

export function ArtifactMarkdownTocSelect({
  contentRef,
  headings,
}: {
  contentRef: RefObject<HTMLElement | null>;
  headings: MarkdownHeading[];
}) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(0);

    const content = contentRef.current;
    const scroller = content?.closest<HTMLElement>(
      "[data-artifact-panel-scroll]"
    );

    if (!(content && scroller)) {
      return;
    }

    const scrollContainer = scroller;
    const elements = headings.map((heading) =>
      findHeadingElement(content, heading)
    );
    let animationFrame = 0;

    function updateActiveHeading() {
      cancelAnimationFrame(animationFrame);
      animationFrame = requestAnimationFrame(() => {
        const threshold = scrollContainer.getBoundingClientRect().top + 24;
        let nextIndex = 0;

        for (const [index, element] of elements.entries()) {
          if (!element || element.getBoundingClientRect().top > threshold) {
            break;
          }
          nextIndex = index;
        }

        setActiveIndex((current) =>
          current === nextIndex ? current : nextIndex
        );
      });
    }

    updateActiveHeading();
    scrollContainer.addEventListener("scroll", updateActiveHeading, {
      passive: true,
    });

    return () => {
      cancelAnimationFrame(animationFrame);
      scrollContainer.removeEventListener("scroll", updateActiveHeading);
    };
  }, [contentRef, headings]);

  if (headings.length < MARKDOWN_TOC_MIN_HEADINGS) {
    return null;
  }

  const selectedHeading = headings[activeIndex] ?? headings[0];

  return (
    <Select
      onValueChange={(value) => {
        const nextIndex = Number(value);
        const heading = headings[nextIndex];

        if (!(heading && Number.isInteger(nextIndex))) {
          return;
        }

        setActiveIndex(nextIndex);
        findHeadingElement(contentRef.current, heading)?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }}
      value={String(activeIndex)}
    >
      <SelectTrigger
        aria-label="Table of contents"
        className="w-full max-w-[32rem]"
      >
        <ListViewIcon aria-hidden className="size-4 text-muted-foreground" />
        <SelectValue>{selectedHeading.text}</SelectValue>
      </SelectTrigger>
      <SelectContent align="start">
        {headings.map((heading, index) => (
          <SelectItem
            className={cn(
              heading.level === 2 && "pl-4",
              heading.level === 3 && "pl-7"
            )}
            key={`${heading.level}-${heading.occurrence}-${heading.text}-${index}`}
            value={String(index)}
          >
            {heading.text}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
