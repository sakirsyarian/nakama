import { describe, expect, test } from "bun:test";
import {
  artifactCanEdit,
  artifactCanTogglePreviewSource,
  artifactPanelBodyClassName,
  artifactPanelHeaderMeta,
  artifactPanelHeadingName,
  artifactPanelTypeLabel,
} from "./artifact-attachment-panel-body.shared";

describe("artifact preview source toggle", () => {
  test("allows html and markdown only", () => {
    expect(
      artifactCanTogglePreviewSource({ isHtml: true, isMarkdown: false })
    ).toBe(true);
    expect(
      artifactCanTogglePreviewSource({ isHtml: false, isMarkdown: true })
    ).toBe(true);
    expect(
      artifactCanTogglePreviewSource({ isHtml: false, isMarkdown: false })
    ).toBe(false);
  });
});

describe("artifact edit", () => {
  test("allows markdown and text, not images or Word", () => {
    expect(
      artifactCanEdit({ filename: "script.md", mimeType: "text/markdown" })
    ).toBe(true);
    expect(
      artifactCanEdit({ filename: "notes.txt", mimeType: "text/plain" })
    ).toBe(true);
    expect(
      artifactCanEdit({ filename: "photo.png", mimeType: "image/png" })
    ).toBe(false);
    expect(
      artifactCanEdit({
        filename: "laporan.docx",
        mimeType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      })
    ).toBe(false);
  });
});

describe("artifact panel header", () => {
  test("strips the extension from the heading name", () => {
    expect(artifactPanelHeadingName("Gpt2 slides.html")).toBe("Gpt2 slides");
    expect(artifactPanelHeadingName("notes.md")).toBe("notes");
    expect(artifactPanelHeadingName("README")).toBe("README");
  });

  test("labels html and markdown files", () => {
    expect(
      artifactPanelTypeLabel({
        filename: "deck.html",
        mimeType: "text/html",
      })
    ).toBe("HTML");
    expect(
      artifactPanelTypeLabel({
        filename: "notes.md",
        mimeType: "text/markdown",
      })
    ).toBe("Markdown");
  });

  test("hides mime size and type when the preview toggle is shown", () => {
    expect(
      artifactPanelHeaderMeta({
        filename: "notes.md",
        mimeType: "text/markdown",
        showPreviewToggle: true,
        sizeBytes: 7700,
      })
    ).toEqual({
      subtitle: null,
      title: "notes",
      typeLabel: null,
    });
  });
});

describe("artifact panel body class", () => {
  test("markdown preview has comfortable reading space", () => {
    expect(
      artifactPanelBodyClassName({
        isHtml: false,
        isImage: false,
        isMarkdown: true,
        previewMode: "preview",
      })
    ).toBe("px-6 py-5");
  });

  test("source view fills the panel with no padding", () => {
    expect(
      artifactPanelBodyClassName({
        isHtml: true,
        isImage: false,
        isMarkdown: false,
        previewMode: "source",
      })
    ).toBe("flex flex-col overflow-hidden p-0");
    expect(
      artifactPanelBodyClassName({
        isHtml: false,
        isImage: false,
        isMarkdown: true,
        previewMode: "source",
      })
    ).toBe("flex flex-col overflow-hidden p-0");
    expect(
      artifactPanelBodyClassName({
        editing: true,
        isHtml: false,
        isImage: false,
        isMarkdown: true,
        previewMode: "preview",
      })
    ).toBe("flex flex-col overflow-hidden p-0");
  });
});
