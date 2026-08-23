type ArtifactShortcutEvent = Pick<
  KeyboardEvent,
  "altKey" | "ctrlKey" | "key" | "metaKey" | "shiftKey"
>;

function hasPrimaryModifier(event: ArtifactShortcutEvent): boolean {
  return event.ctrlKey || event.metaKey;
}

export function isArtifactEditShortcut(event: ArtifactShortcutEvent): boolean {
  return (
    hasPrimaryModifier(event) &&
    event.shiftKey &&
    !event.altKey &&
    event.key.toLowerCase() === "e"
  );
}

export function isArtifactSaveShortcut(event: ArtifactShortcutEvent): boolean {
  return (
    hasPrimaryModifier(event) &&
    !event.shiftKey &&
    !event.altKey &&
    event.key.toLowerCase() === "s"
  );
}
