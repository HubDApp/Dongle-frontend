import { describe, it, expect } from "vitest";
import { columnsForWidth, computeVirtualRange } from "@/hooks/useWindowVirtualRows";

describe("computeVirtualRange", () => {
  it("renders only the visible rows plus overscan for 1000 projects", () => {
    const r = computeVirtualRange(1000, 3, 644, 644 * 100, 900, 2);
    expect(r.start).toBe(98 * 3);
    expect(r.end).toBe(104 * 3);
    expect(r.end - r.start).toBeLessThan(30);
    expect(r.paddingTop).toBe(98 * 644);
    expect(r.paddingTop + r.paddingBottom + ((r.end - r.start) / 3) * 644).toBe(
      Math.ceil(1000 / 3) * 644,
    );
  });

  it("starts at the top before the grid is scrolled into view", () => {
    const r = computeVirtualRange(20, 2, 644, -400, 900, 2);
    expect(r.start).toBe(0);
    expect(r.paddingTop).toBe(0);
  });

  it("maps widths to the grid's breakpoints", () => {
    expect(columnsForWidth(375)).toBe(1);
    expect(columnsForWidth(800)).toBe(2);
    expect(columnsForWidth(1280)).toBe(3);
  });
});
