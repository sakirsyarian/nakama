import { describe, expect, it } from "bun:test";
import {
  isArtifactEditShortcut,
  isArtifactSaveShortcut,
} from "@/lib/artifact-keyboard-shortcuts";

function keyboardEvent(
  overrides: Partial<Parameters<typeof isArtifactEditShortcut>[0]> = {}
) {
  return {
    altKey: false,
    ctrlKey: false,
    key: "",
    metaKey: false,
    shiftKey: false,
    ...overrides,
  };
}

describe("artifact keyboard shortcuts", () => {
  it("recognizes Ctrl/Cmd+Shift+E as edit", () => {
    expect(
      isArtifactEditShortcut(
        keyboardEvent({ ctrlKey: true, key: "E", shiftKey: true })
      )
    ).toBe(true);
    expect(
      isArtifactEditShortcut(
        keyboardEvent({ key: "e", metaKey: true, shiftKey: true })
      )
    ).toBe(true);
  });

  it("does not treat unmodified E or Ctrl+E as edit", () => {
    expect(isArtifactEditShortcut(keyboardEvent({ key: "e" }))).toBe(false);
    expect(
      isArtifactEditShortcut(keyboardEvent({ ctrlKey: true, key: "e" }))
    ).toBe(false);
  });

  it("recognizes Ctrl/Cmd+S as save without extra modifiers", () => {
    expect(
      isArtifactSaveShortcut(keyboardEvent({ ctrlKey: true, key: "s" }))
    ).toBe(true);
    expect(
      isArtifactSaveShortcut(keyboardEvent({ key: "S", metaKey: true }))
    ).toBe(true);
    expect(
      isArtifactSaveShortcut(
        keyboardEvent({ ctrlKey: true, key: "s", shiftKey: true })
      )
    ).toBe(false);
  });
});
