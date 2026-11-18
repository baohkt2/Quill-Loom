export interface ScrollMetrics {
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
}

export const AUTO_SCROLL_BOTTOM_THRESHOLD_PX = 120;

export function getDistanceFromBottom(metrics: ScrollMetrics): number {
  return Math.max(0, metrics.scrollHeight - metrics.clientHeight - metrics.scrollTop);
}

export function isNearBottom(
  metrics: ScrollMetrics,
  thresholdPx = AUTO_SCROLL_BOTTOM_THRESHOLD_PX
): boolean {
  return getDistanceFromBottom(metrics) <= thresholdPx;
}

export function shouldShowJumpToBottom(
  metrics: ScrollMetrics,
  thresholdPx = AUTO_SCROLL_BOTTOM_THRESHOLD_PX
): boolean {
  const isScrollable = metrics.scrollHeight > metrics.clientHeight + 24;
  return isScrollable && !isNearBottom(metrics, thresholdPx);
}

export interface AutoScrollEvaluationInput {
  previousScrollTop: number;
  metrics: ScrollMetrics;
  isProgrammaticScroll: boolean;
  currentAutoScroll: boolean;
  thresholdPx?: number;
}

export interface AutoScrollEvaluationResult {
  nextAutoScroll: boolean;
  showJumpButton: boolean;
  userScrolledUp: boolean;
}

/**
 * Evaluates whether streaming auto-scroll should remain active or pause
 * after a scroll event, respecting any manual upward scroll immediately.
 */
export function evaluateScrollState({
  previousScrollTop,
  metrics,
  isProgrammaticScroll,
  currentAutoScroll,
  thresholdPx = AUTO_SCROLL_BOTTOM_THRESHOLD_PX,
}: AutoScrollEvaluationInput): AutoScrollEvaluationResult {
  const distanceFromBottom = getDistanceFromBottom(metrics);
  const nearBottom = distanceFromBottom <= thresholdPx;
  const showJumpButton = shouldShowJumpToBottom(metrics, thresholdPx);

  if (isProgrammaticScroll) {
    return {
      nextAutoScroll: currentAutoScroll,
      showJumpButton,
      userScrolledUp: false,
    };
  }

  const userScrolledUp = metrics.scrollTop < previousScrollTop - 2;
  if (userScrolledUp) {
    return {
      nextAutoScroll: false,
      showJumpButton,
      userScrolledUp: true,
    };
  }

  const userScrolledDown = metrics.scrollTop > previousScrollTop + 1;
  if ((userScrolledDown && nearBottom) || distanceFromBottom <= 8) {
    return {
      nextAutoScroll: true,
      showJumpButton,
      userScrolledUp: false,
    };
  }

  return {
    nextAutoScroll: currentAutoScroll,
    showJumpButton,
    userScrolledUp: false,
  };
}
