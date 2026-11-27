// Ignore typing, IME composition, held keys, and browser/OS shortcuts.
export function isVoiceShortcut(event: KeyboardEvent, key: string): boolean {
  if (event.defaultPrevented || event.repeat || event.isComposing ||
      event.ctrlKey || event.metaKey || event.altKey || event.shiftKey ||
      event.key.toLowerCase() !== key.toLowerCase()) return false;

  const target = event.target instanceof Element ? event.target : null;
  return !target?.closest(
    'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"], [role="dialog"]'
  ) && !document.querySelector('[role="dialog"], dialog[open]');
}
