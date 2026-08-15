import { describe, expect, test } from "bun:test";
import {
  artifactPanelScrollRatio,
  artifactPanelScrollTop,
} from "./attachment-detail-panel-scroll";

describe("artifact panel scroll restoration", () => {
  test("reads a ratio from the current scroll position", () => {
    expect(artifactPanelScrollRatio(250, 1000, 500)).toBe(0.5);
    expect(artifactPanelScrollRatio(0, 1000, 500)).toBe(0);
    expect(artifactPanelScrollRatio(500, 1000, 500)).toBe(1);
  });

  test("returns zero when the content does not overflow", () => {
    expect(artifactPanelScrollRatio(0, 400, 400)).toBe(0);
    expect(artifactPanelScrollTop(400, 400, 0.5)).toBe(0);
  });

  test("restores the matching offset on a different content height", () => {
    expect(artifactPanelScrollTop(2000, 500, 0.5)).toBe(750);
  });
});
