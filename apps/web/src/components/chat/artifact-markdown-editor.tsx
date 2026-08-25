import { useLayoutEffect, useRef } from "react";
import { restoreArtifactEditorScrollTop } from "@/components/chat/artifact-markdown-editor-scroll";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { isArtifactSaveShortcut } from "@/lib/artifact-keyboard-shortcuts";

export function ArtifactMarkdownEditor({
  busy,
  draft,
  error,
  onCancel,
  onChange,
  onSave,
}: {
  busy: boolean;
  draft: string;
  error: string | null;
  onCancel: () => void;
  onChange: (value: string) => void;
  onSave: () => void;
}) {
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const scrollTopRef = useRef(0);

  useLayoutEffect(() => {
    restoreArtifactEditorScrollTop(editorRef.current, scrollTopRef.current);
  }, [draft]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
      {error ? (
        <p className="shrink-0 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-destructive text-sm">
          {error}
        </p>
      ) : null}

      <Textarea
        className="field-sizing-fixed min-h-[16rem] flex-1 resize-none overflow-y-auto font-mono text-xs leading-relaxed"
        data-artifact-inner-scroll=""
        disabled={busy}
        onChange={(event) => {
          scrollTopRef.current = event.currentTarget.scrollTop;
          onChange(event.currentTarget.value);
        }}
        onKeyDown={(event) => {
          if (event.nativeEvent.isComposing) {
            return;
          }

          if (isArtifactSaveShortcut(event)) {
            event.preventDefault();
            if (!busy) {
              onSave();
            }
            return;
          }

          if (
            event.key === "Escape" &&
            !(event.altKey || event.ctrlKey || event.metaKey || event.shiftKey)
          ) {
            event.preventDefault();
            if (!busy) {
              onCancel();
            }
          }
        }}
        onScroll={(event) => {
          scrollTopRef.current = event.currentTarget.scrollTop;
        }}
        ref={editorRef}
        value={draft}
      />

      <div className="flex shrink-0 items-center justify-end gap-2">
        <Button
          aria-keyshortcuts="Escape"
          disabled={busy}
          onClick={onCancel}
          size="sm"
          type="button"
          variant="outline"
        >
          Cancel
        </Button>
        <Button
          aria-keyshortcuts="Control+S Meta+S"
          disabled={busy}
          onClick={onSave}
          size="sm"
          type="button"
        >
          {busy ? <Spinner className="size-4" /> : "Save"}
        </Button>
      </div>
    </div>
  );
}
