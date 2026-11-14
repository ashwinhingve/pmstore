export function menuPosition(trigger: { left: number; right: number; top: number; bottom: number }, viewport: { width: number; height: number; left?: number; top?: number }, height: number, align: 'left' | 'right') {
  const edge = 12;
  const viewportLeft = viewport.left ?? 0;
  const viewportTop = viewport.top ?? 0;
  const width = Math.min(288, Math.max(1, viewport.width - edge * 2));
  const left = Math.min(Math.max(align === 'right' ? trigger.right - width : trigger.left, viewportLeft + edge), viewportLeft + viewport.width - width - edge);
  const below = Math.max(1, viewportTop + viewport.height - trigger.bottom - 8 - edge);
  const above = Math.max(1, trigger.top - viewportTop - 8 - edge);
  const flip = height > below && above > below;
  const maxHeight = Math.min(height, Math.max(1, viewport.height - edge * 2), flip ? above : below);
  const top = Math.min(viewportTop + viewport.height - edge - maxHeight, Math.max(viewportTop + edge, flip ? trigger.top - maxHeight - 8 : trigger.bottom + 8));
  return { left, top, width, maxHeight };
}
