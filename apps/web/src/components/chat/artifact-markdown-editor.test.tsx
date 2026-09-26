import { expect, test } from "bun:test";
import { act } from "react";

const { createRoot } = await import("react-dom/client");
const { ArtifactMarkdownEditor } = await import("./artifact-markdown-editor");

function setValue(textarea: Element, value: string) {
  const setter = Object.getOwnPropertyDescriptor(
    Object.getPrototypeOf(textarea),
    "value"
  )?.set;
  setter?.call(textarea, value);
  // `Event` on the test global is Bun's, not happy-dom's — dispatch needs the
  // window's own constructor for the instanceof check inside dispatchEvent.
  textarea.dispatchEvent(new window.Event("input", { bubbles: true }));
}

function button(label: string): HTMLButtonElement {
  const element = [...document.querySelectorAll("button")].find(
    (entry) => entry.textContent === label
  );
  if (!element) {
    throw new Error(`Missing button: ${label}`);
  }
  return element as HTMLButtonElement;
}

test("artifact editor keeps the draft across parent re-renders and saves the edited content", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  let saved: string | null = null;
  const baseProps = {
    busy: false,
    error: null,
    initialDraft: "# Draft\n",
    onCancel: () => {},
    onSave: (nextContent: string) => {
      saved = nextContent;
    },
  };

  try {
    await act(async () => {
      root.render(<ArtifactMarkdownEditor {...baseProps} />);
    });

    const textarea = container.querySelector("textarea");
    expect(textarea).not.toBeNull();
    expect(textarea?.value).toBe("# Draft\n");

    await act(async () => {
      setValue(textarea as HTMLTextAreaElement, "# Draft\n\nMore\n");
    });
    expect(textarea?.value).toBe("# Draft\n\nMore\n");

    // The panel pushes config updates on every state change; those re-renders
    // must not reset the editor or remount its textarea.
    await act(async () => {
      root.render(<ArtifactMarkdownEditor {...baseProps} busy />);
    });
    const sameNode = container.querySelector("textarea");
    expect(sameNode).toBe(textarea);
    expect(sameNode?.value).toBe("# Draft\n\nMore\n");
    expect(button("Cancel").disabled).toBe(true);

    await act(async () => {
      root.render(<ArtifactMarkdownEditor {...baseProps} />);
    });
    expect(button("Cancel").disabled).toBe(false);
    await act(async () => button("Save").click());
    expect(saved).toBe("# Draft\n\nMore\n");
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
});

test("artifact editor cancel does not save", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  let saves = 0;
  let cancels = 0;

  try {
    await act(async () => {
      root.render(
        <ArtifactMarkdownEditor
          busy={false}
          error={null}
          initialDraft="draft"
          onCancel={() => {
            cancels += 1;
          }}
          onSave={() => {
            saves += 1;
          }}
        />
      );
    });

    await act(async () => button("Cancel").click());
    expect(cancels).toBe(1);
    expect(saves).toBe(0);
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
});
