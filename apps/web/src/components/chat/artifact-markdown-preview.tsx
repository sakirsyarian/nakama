import { ArrowDown01Icon } from "hugeicons-react";
import { type ComponentPropsWithoutRef, useMemo } from "react";
import { MessageResponse } from "@/components/ai-elements/message";
import { buttonVariants } from "@/components/ui/button-variants";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  headingTextFromChildren,
  MARKDOWN_TOC_MIN_HEADINGS,
  type MarkdownTocEntry,
  normalizeMarkdownHeadingText,
  scrollMarkdownHeadingIntoView,
  slugifyMarkdownHeading,
} from "@/lib/markdown-toc";
import { cn } from "@/lib/utils";

const TOC_ITEM_PAD: Record<MarkdownTocEntry["level"], string> = {
  1: "pl-1.5",
  2: "pl-4",
  3: "pl-7",
  4: "pl-10",
};

function scheduleScrollToHeading(entry: MarkdownTocEntry) {
  requestAnimationFrame(() => {
    scrollMarkdownHeadingIntoView(entry);
  });
}

function createHeadingComponents() {
  function heading(Tag: "h1" | "h2" | "h3" | "h4") {
    return function ArtifactHeading({
      children,
      className,
      id: _ignoredId,
      ...props
    }: ComponentPropsWithoutRef<typeof Tag>) {
      const text = normalizeMarkdownHeadingText(
        headingTextFromChildren(children)
      );
      const slug = text ? slugifyMarkdownHeading(text) : undefined;

      return (
        <Tag
          {...props}
          className={cn("scroll-mt-3", className)}
          data-artifact-heading={slug}
        >
          {children}
        </Tag>
      );
    };
  }

  return {
    h1: heading("h1"),
    h2: heading("h2"),
    h3: heading("h3"),
    h4: heading("h4"),
  };
}

export function ArtifactMarkdownTocSelect({
  className,
  entries,
}: {
  className?: string;
  entries: MarkdownTocEntry[];
}) {
  if (entries.length < MARKDOWN_TOC_MIN_HEADINGS) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            aria-label="Contents"
            className={cn(
              buttonVariants({ size: "sm", variant: "outline" }),
              "max-w-44 shrink-0",
              className
            )}
            type="button"
          />
        }
      >
        <span className="truncate">Contents</span>
        <ArrowDown01Icon
          aria-hidden
          className="size-3.5 text-muted-foreground"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="min-w-72 max-w-[min(20rem,var(--available-width))]"
      >
        {entries.map((entry) => (
          <DropdownMenuItem
            className={cn(
              "cursor-pointer items-start whitespace-normal text-left",
              TOC_ITEM_PAD[entry.level],
              entry.level > 2 ? "text-muted-foreground" : null
            )}
            key={entry.id}
            onClick={() => scheduleScrollToHeading(entry)}
          >
            {entry.text}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ArtifactMarkdownPreview({
  content,
  streaming = false,
}: {
  content: string;
  streaming?: boolean;
}) {
  const components = useMemo(() => createHeadingComponents(), [content]);

  return (
    <MessageResponse
      className="w-full max-w-none text-sm"
      components={components}
      isAnimating={streaming}
    >
      {content}
    </MessageResponse>
  );
}
