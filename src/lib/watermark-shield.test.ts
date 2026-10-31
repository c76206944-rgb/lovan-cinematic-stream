import { describe, expect, it } from "vitest";
import { shieldRect } from "../components/site/WatermarkShield";

describe("watermark shield", () => {
  it("covers the top-right corner of a fitted 16:9 picture", () => {
    const r = shieldRect(1600, 900, 1600, 900, "fit")!;
    expect(r.left).toBeCloseTo(1280);
    expect(r.top).toBeCloseTo(0);
  });
  it("follows the bottom-anchored picture in Full mode", () => {
    const r = shieldRect(800, 800, 1600, 900, "full")!;
    // scale = 800/900; picture height 800, top at 0
    expect(r.top).toBeCloseTo(0);
  });
});
