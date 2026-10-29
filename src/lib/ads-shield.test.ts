import { it, expect } from "vitest";
import { enterPlayback, popupBlocked, playbackActive } from "./ads";

it("refuses ad popups while a video player is open and allows them after it closes", () => {
  expect(popupBlocked(Date.now() + 10_000)).toBe(false);
  const leave = enterPlayback();
  expect(playbackActive()).toBe(true);
  expect(popupBlocked(Date.now() + 10_000)).toBe(true);
  leave();
  expect(popupBlocked(Date.now() + 10_000)).toBe(false);
});
