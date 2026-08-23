import { describe, expect, test } from "bun:test";
import { restoreArtifactEditorScrollTop } from "./artifact-markdown-editor-scroll";

describe("artifact markdown editor scroll position", () => {
  test("restores the captured offset after a controlled draft update", () => {
    const editor = { scrollTop: 1600 };

    restoreArtifactEditorScrollTop(editor, 240);

    expect(editor.scrollTop).toBe(240);
  });

  test("does not write when the offset is already correct", () => {
    let writes = 0;
    const editor = {
      get scrollTop() {
        return 240;
      },
      set scrollTop(_value: number) {
        writes += 1;
      },
    };

    restoreArtifactEditorScrollTop(editor, 240);

    expect(writes).toBe(0);
  });
});
