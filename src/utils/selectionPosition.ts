export interface SelectionPopoverCoords {
  top: number;
  left: number;
}

const MIRROR_STYLE_PROPS: Array<keyof CSSStyleDeclaration> = [
  'boxSizing',
  'width',
  'fontFamily',
  'fontSize',
  'fontWeight',
  'fontStyle',
  'letterSpacing',
  'textTransform',
  'wordSpacing',
  'textIndent',
  'lineHeight',
  'textAlign',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'borderTopWidth',
  'borderRightWidth',
  'borderBottomWidth',
  'borderLeftWidth',
];

/**
 * Computes viewport-relative coordinates for a <textarea> selection range
 * using a hidden typography-matched mirror element, clamped inside the container.
 */
export function getTextareaSelectionCoords(
  textarea: HTMLTextAreaElement,
  container: HTMLElement,
  selectionStart: number,
  selectionEnd: number
): SelectionPopoverCoords {
  const containerRect = container.getBoundingClientRect();
  const taRect = textarea.getBoundingClientRect();

  const computed = window.getComputedStyle(textarea);
  const mirror = document.createElement('div');
  mirror.style.position = 'fixed';
  mirror.style.visibility = 'hidden';
  mirror.style.pointerEvents = 'none';
  mirror.style.top = '0px';
  mirror.style.left = '-9999px';
  mirror.style.whiteSpace = 'pre-wrap';
  mirror.style.wordWrap = 'break-word';
  mirror.style.overflowWrap = 'break-word';

  for (const prop of MIRROR_STYLE_PROPS) {
    (mirror.style as unknown as Record<string, string>)[prop as string] = computed[prop] as string;
  }

  const text = textarea.value;
  const start = Math.max(0, Math.min(selectionStart, text.length));
  const end = Math.max(start, Math.min(selectionEnd, text.length));

  const beforeNode = document.createTextNode(text.slice(0, start));
  const selectedSpan = document.createElement('span');
  selectedSpan.textContent = text.slice(start, end) || ' ';
  const afterNode = document.createTextNode(text.slice(end));

  mirror.appendChild(beforeNode);
  mirror.appendChild(selectedSpan);
  mirror.appendChild(afterNode);
  document.body.appendChild(mirror);

  const mirrorRect = mirror.getBoundingClientRect();
  const spanRect = selectedSpan.getBoundingClientRect();

  document.body.removeChild(mirror);

  const lineHeightPx = parseFloat(computed.lineHeight) || 28;
  const relTop = spanRect.top - mirrorRect.top + (taRect.top - containerRect.top);
  const relLeft = spanRect.left - mirrorRect.left + (taRect.left - containerRect.left);

  // Place cleanly below the selected line so the highlighted prose stays readable,
  // flipping above if the selection is near the bottom edge of the viewport.
  const placeBelowTop = relTop + lineHeightPx + 8;
  const placeAboveTop = relTop - 150;
  const preferredTop =
    placeBelowTop > containerRect.height - 190 && placeAboveTop >= 12
      ? placeAboveTop
      : placeBelowTop;

  // Clamp cleanly within the visible container bounds
  const clampedTop = Math.max(12, Math.min(preferredTop, Math.max(12, containerRect.height - 240)));
  const clampedLeft = Math.max(16, Math.min(relLeft, Math.max(16, containerRect.width - 476)));

  return {
    top: clampedTop,
    left: clampedLeft,
  };
}
