import { describe, expect, it } from "vitest";
import {
  HeatmapCollector,
  heatColor,
  pointsToCells,
} from "@/services/form-heatmap";

function makeForm(): HTMLFormElement {
  const form = document.createElement("form");
  form.style.width = "400px";
  form.style.height = "600px";
  Object.defineProperty(form, "getBoundingClientRect", {
    value: () => ({
      left: 0,
      top: 0,
      right: 400,
      bottom: 600,
      width: 400,
      height: 600,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }),
  });
  const input = document.createElement("input");
  input.name = "websiteUrl";
  form.appendChild(input);
  document.body.appendChild(form);
  return form;
}

describe("HeatmapCollector", () => {
  it("records clicks, mouse movement, and scroll depth", () => {
    const form = makeForm();
    const collector = new HeatmapCollector("project-form", "project-submission");
    collector.attach(form);

    form.dispatchEvent(
      new MouseEvent("click", { clientX: 100, clientY: 150, bubbles: true }),
    );
    form.dispatchEvent(
      new MouseEvent("mousemove", { clientX: 120, clientY: 160, bubbles: true }),
    );
    window.dispatchEvent(new Event("scroll"));

    const snap = collector.snapshot();
    expect(snap.clicks.length).toBeGreaterThanOrEqual(1);
    expect(snap.mousePath.length).toBeGreaterThanOrEqual(1);
    expect(snap.maxScrollDepth).toBeGreaterThanOrEqual(0);
    expect(snap.heatPoints.length).toBeGreaterThanOrEqual(1);

    collector.detach();
    form.remove();
  });

  it("identifies rage-click problem areas", () => {
    const form = makeForm();
    const collector = new HeatmapCollector("f", "t", {
      rageClickThreshold: 3,
      rageClickWindowMs: 1000,
    });
    collector.attach(form);

    const input = form.querySelector("input")!;
    for (let i = 0; i < 4; i++) {
      input.dispatchEvent(
        new MouseEvent("click", { clientX: 50, clientY: 50, bubbles: true }),
      );
    }

    const areas = collector.identifyProblemAreas();
    expect(areas.some((a) => a.issue === "rage_click")).toBe(true);
    collector.detach();
    form.remove();
  });
});

describe("visualize", () => {
  it("maps heat intensity to colors", () => {
    expect(heatColor(0)).toContain("rgba");
    expect(heatColor(1)).toContain("239, 68, 68");
    const cells = pointsToCells([
      { x: 0.1, y: 0.2, weight: 5, timestamp: 1 },
      { x: 0.3, y: 0.4, weight: 1, timestamp: 2 },
    ]);
    expect(cells[0].intensity).toBe(1);
    expect(cells[1].intensity).toBe(0.2);
  });
});
