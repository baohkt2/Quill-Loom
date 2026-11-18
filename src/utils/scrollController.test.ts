import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateScrollState,
  getDistanceFromBottom,
  isNearBottom,
  shouldShowJumpToBottom,
} from './scrollController';

test('getDistanceFromBottom and isNearBottom evaluate 120px bottom threshold accurately', () => {
  assert.equal(
    getDistanceFromBottom({ scrollTop: 880, scrollHeight: 1600, clientHeight: 600 }),
    120
  );
  assert.equal(
    isNearBottom({ scrollTop: 880, scrollHeight: 1600, clientHeight: 600 }),
    true
  );
  assert.equal(
    isNearBottom({ scrollTop: 879, scrollHeight: 1600, clientHeight: 600 }),
    false
  );
});

test('shouldShowJumpToBottom stays hidden when short or near bottom, and appears when scrolled up', () => {
  assert.equal(
    shouldShowJumpToBottom({ scrollTop: 0, scrollHeight: 600, clientHeight: 600 }),
    false
  );
  assert.equal(
    shouldShowJumpToBottom({ scrollTop: 920, scrollHeight: 1600, clientHeight: 600 }),
    false
  );
  assert.equal(
    shouldShowJumpToBottom({ scrollTop: 400, scrollHeight: 1600, clientHeight: 600 }),
    true
  );
});

test('evaluateScrollState disables auto-scroll immediately on upward manual scroll and re-enables when scrolling back near bottom', () => {
  // User scrolls up slightly from the bottom -> immediately pauses auto-scroll
  const scrolledUp = evaluateScrollState({
    previousScrollTop: 1000,
    metrics: { scrollTop: 950, scrollHeight: 1600, clientHeight: 600 },
    isProgrammaticScroll: false,
    currentAutoScroll: true,
  });
  assert.equal(scrolledUp.userScrolledUp, true);
  assert.equal(scrolledUp.nextAutoScroll, false);

  // User scrolls further up -> jump button becomes visible and auto-scroll stays off
  const scrolledFarUp = evaluateScrollState({
    previousScrollTop: 950,
    metrics: { scrollTop: 500, scrollHeight: 1600, clientHeight: 600 },
    isProgrammaticScroll: false,
    currentAutoScroll: false,
  });
  assert.equal(scrolledFarUp.nextAutoScroll, false);
  assert.equal(scrolledFarUp.showJumpButton, true);

  // User scrolls back down into the 120px bottom zone -> auto-scroll re-engages
  const scrolledBackDown = evaluateScrollState({
    previousScrollTop: 500,
    metrics: { scrollTop: 910, scrollHeight: 1600, clientHeight: 600 },
    isProgrammaticScroll: false,
    currentAutoScroll: false,
  });
  assert.equal(scrolledBackDown.nextAutoScroll, true);
  assert.equal(scrolledBackDown.showJumpButton, false);
});

test('evaluateScrollState ignores programmatic scroll events during streaming updates', () => {
  const res = evaluateScrollState({
    previousScrollTop: 1000,
    metrics: { scrollTop: 950, scrollHeight: 1600, clientHeight: 600 },
    isProgrammaticScroll: true,
    currentAutoScroll: true,
  });
  assert.equal(res.nextAutoScroll, true);
  assert.equal(res.userScrolledUp, false);
});
