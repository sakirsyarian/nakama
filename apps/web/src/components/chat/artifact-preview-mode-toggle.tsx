import { CodeSquareIcon, PencilIcon, ViewIcon } from "hugeicons-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ArtifactPreviewMode = "preview" | "source";
export type ArtifactPanelView = ArtifactPreviewMode | "edit";

function tabClass(active: boolean) {
  return cn(
    "size-6 rounded-sm",
    active
      ? "border-border bg-background text-foreground shadow-sm hover:bg-background"
      : "text-muted-foreground"
  );
}

export function ArtifactPreviewModeToggle({
  mode,
  onChange,
  onEdit,
  showEdit = false,
  editDisabled = false,
}: {
  mode: ArtifactPanelView;
  onChange: (mode: ArtifactPreviewMode) => void;
  onEdit?: () => void;
  showEdit?: boolean;
  editDisabled?: boolean;
}) {
  return (
    <div
      aria-label="Preview mode"
      className="inline-flex shrink-0 items-center rounded-md bg-muted p-0.5"
      role="group"
    >
      <Button
        aria-label="Rendered"
        aria-pressed={mode === "preview"}
        className={tabClass(mode === "preview")}
        onClick={() => onChange("preview")}
        size="icon-xs"
        type="button"
        variant="ghost"
      >
        <ViewIcon aria-hidden className="size-3.5" />
      </Button>
      <Button
        aria-label="Code"
        aria-pressed={mode === "source"}
        className={tabClass(mode === "source")}
        onClick={() => onChange("source")}
        size="icon-xs"
        type="button"
        variant="ghost"
      >
        <CodeSquareIcon aria-hidden className="size-3.5" />
      </Button>
      {showEdit ? (
        <Button
          aria-label="Edit"
          aria-pressed={mode === "edit"}
          className={tabClass(mode === "edit")}
          disabled={editDisabled}
          onClick={() => onEdit?.()}
          size="icon-xs"
          type="button"
          variant="ghost"
        >
          <PencilIcon aria-hidden className="size-3.5" />
        </Button>
      ) : null}
    </div>
  );
}
