interface ScrollPositionTarget {
  scrollTop: number;
}

export function restoreArtifactEditorScrollTop(
  editor: ScrollPositionTarget | null,
  scrollTop: number
): void {
  if (editor && editor.scrollTop !== scrollTop) {
    editor.scrollTop = scrollTop;
  }
}
