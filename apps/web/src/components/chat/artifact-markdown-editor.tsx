import { Button } from "@nakama/ui/button";
import { Spinner } from "@nakama/ui/spinner";
import { Textarea } from "@nakama/ui/textarea";
import { useState } from "react";

export function ArtifactMarkdownEditor({
  busy,
  error,
  initialDraft,
  onCancel,
  onSave,
}: {
  busy: boolean;
  error: string | null;
  initialDraft: string;
  onCancel: () => void;
  onSave: (nextContent: string) => void;
}) {
  // The draft lives here, not in the panel hook: routing every keystroke
  // through the panel context re-rendered the whole page and the panel's
  // scroll restoration kept yanking the editor away mid-typing.
  const [draft, setDraft] = useState(initialDraft);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
      {error ? (
        <p className="shrink-0 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-destructive text-sm">
          {error}
        </p>
      ) : null}

      <Textarea
        className="field-sizing-fixed min-h-[16rem] flex-1 resize-none overflow-y-auto font-mono text-xs leading-relaxed"
        disabled={busy}
        onChange={(event) => setDraft(event.target.value)}
        value={draft}
      />

      <div className="flex shrink-0 items-center justify-end gap-2">
        <Button
          disabled={busy}
          onClick={onCancel}
          size="sm"
          type="button"
          variant="outline"
        >
          Cancel
        </Button>
        <Button
          disabled={busy}
          onClick={() => onSave(draft)}
          size="sm"
          type="button"
        >
          {busy ? <Spinner className="size-4" /> : "Save"}
        </Button>
      </div>
    </div>
  );
}
