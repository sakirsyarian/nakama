export const ARTIFACT_INNER_SCROLL_ATTR = "data-artifact-inner-scroll";

export function artifactPanelScrollRatio(
  scrollTop: number,
  scrollHeight: number,
  clientHeight: number
): number {
  const max = scrollHeight - clientHeight;
  if (max <= 0) {
    return 0;
  }

  return Math.min(1, Math.max(0, scrollTop / max));
}

export function artifactPanelScrollTop(
  scrollHeight: number,
  clientHeight: number,
  ratio: number
): number {
  const max = Math.max(0, scrollHeight - clientHeight);
  return max * Math.min(1, Math.max(0, ratio));
}

export function getArtifactPanelScroller(root: HTMLElement): HTMLElement {
  const nested = root.querySelector<HTMLElement>(
    `[${ARTIFACT_INNER_SCROLL_ATTR}]`
  );
  return nested ?? root;
}

export function readArtifactPanelScrollRatio(root: HTMLElement): number {
  const scroller = getArtifactPanelScroller(root);
  return artifactPanelScrollRatio(
    scroller.scrollTop,
    scroller.scrollHeight,
    scroller.clientHeight
  );
}

export function writeArtifactPanelScrollRatio(
  root: HTMLElement,
  ratio: number
) {
  const scroller = getArtifactPanelScroller(root);
  scroller.scrollTop = artifactPanelScrollTop(
    scroller.scrollHeight,
    scroller.clientHeight,
    ratio
  );
}
