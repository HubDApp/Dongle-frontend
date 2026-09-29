/**
 * Heatmap collector — click maps, scroll depth, mouse path, problem areas.
 */

import { DEFAULT_CONFIG, STORAGE_KEY, createConfig } from "./config";
import type {
  ClickEvent,
  HeatmapConfig,
  HeatmapSnapshot,
  HeatPoint,
  MouseSample,
  ProblemArea,
  ScrollDepthSample,
} from "./types";

function createSessionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  }
  return `h${Date.now().toString(36)}`;
}

function fieldIdFromTarget(target: EventTarget | null): string | undefined {
  if (!(target instanceof HTMLElement)) return undefined;
  const el =
    target.closest<HTMLElement>("[name],[id],[data-field]") ?? target;
  return (
    el.getAttribute("data-field") ||
    el.getAttribute("name") ||
    el.id ||
    undefined
  );
}

export class HeatmapCollector {
  private config: HeatmapConfig;
  private formId: string;
  private formType: string;
  private sessionId: string;
  private clicks: ClickEvent[] = [];
  private scrollSamples: ScrollDepthSample[] = [];
  private mousePath: MouseSample[] = [];
  private startedAt: number;
  private formEl: HTMLElement | null = null;
  private lastMouseSample = 0;
  private hesitationTimers = new Map<string, number>();
  private hesitationCounts = new Map<string, number>();
  private listenersAttached = false;

  private onClick = (e: MouseEvent) => this.handleClick(e);
  private onMove = (e: MouseEvent) => this.handleMove(e);
  private onScroll = () => this.handleScroll();
  private onFocusIn = (e: FocusEvent) => this.handleFocusIn(e);
  private onFocusOut = (e: FocusEvent) => this.handleFocusOut(e);

  constructor(
    formId: string,
    formType: string,
    config: Partial<HeatmapConfig> = {},
  ) {
    this.config = createConfig(config);
    this.formId = formId;
    this.formType = formType;
    this.sessionId = createSessionId();
    this.startedAt = Date.now();
  }

  attach(formEl: HTMLElement): void {
    if (!this.config.enabled || this.listenersAttached) return;
    this.formEl = formEl;
    formEl.addEventListener("click", this.onClick, true);
    formEl.addEventListener("mousemove", this.onMove, { passive: true });
    formEl.addEventListener("focusin", this.onFocusIn);
    formEl.addEventListener("focusout", this.onFocusOut);
    window.addEventListener("scroll", this.onScroll, { passive: true });
    this.listenersAttached = true;
    this.handleScroll();
  }

  detach(): void {
    if (!this.formEl || !this.listenersAttached) return;
    this.formEl.removeEventListener("click", this.onClick, true);
    this.formEl.removeEventListener("mousemove", this.onMove);
    this.formEl.removeEventListener("focusin", this.onFocusIn);
    this.formEl.removeEventListener("focusout", this.onFocusOut);
    window.removeEventListener("scroll", this.onScroll);
    this.listenersAttached = false;
  }

  private relativeCoords(clientX: number, clientY: number): { x: number; y: number } {
    if (!this.formEl) return { x: 0, y: 0 };
    const rect = this.formEl.getBoundingClientRect();
    const x = rect.width > 0 ? (clientX - rect.left) / rect.width : 0;
    const y = rect.height > 0 ? (clientY - rect.top) / rect.height : 0;
    return {
      x: Math.min(1, Math.max(0, x)),
      y: Math.min(1, Math.max(0, y)),
    };
  }

  private handleClick(e: MouseEvent): void {
    if (this.clicks.length >= this.config.maxClicks) return;
    const { x, y } = this.relativeCoords(e.clientX, e.clientY);
    const target = e.target;
    this.clicks.push({
      x,
      y,
      timestamp: Date.now(),
      targetTag:
        target instanceof HTMLElement ? target.tagName.toLowerCase() : "unknown",
      fieldId: fieldIdFromTarget(target),
      button: e.button,
    });
  }

  private handleMove(e: MouseEvent): void {
    const now = Date.now();
    if (now - this.lastMouseSample < this.config.sampleMouseMs) return;
    if (this.mousePath.length >= this.config.maxMouseSamples) return;
    this.lastMouseSample = now;
    const { x, y } = this.relativeCoords(e.clientX, e.clientY);
    this.mousePath.push({ x, y, timestamp: now });
  }

  private handleScroll(): void {
    if (!this.formEl) return;
    const rect = this.formEl.getBoundingClientRect();
    const viewportBottom = window.innerHeight;
    const visibleBottom = Math.min(viewportBottom, rect.bottom) - rect.top;
    const depth =
      rect.height > 0
        ? Math.min(1, Math.max(0, visibleBottom / rect.height))
        : 0;
    this.scrollSamples.push({ depth, timestamp: Date.now() });
    if (this.scrollSamples.length > 200) {
      this.scrollSamples = this.scrollSamples.slice(-200);
    }
  }

  private handleFocusIn(e: FocusEvent): void {
    const id = fieldIdFromTarget(e.target);
    if (!id) return;
    this.hesitationTimers.set(id, Date.now());
  }

  private handleFocusOut(e: FocusEvent): void {
    const id = fieldIdFromTarget(e.target);
    if (!id) return;
    const start = this.hesitationTimers.get(id);
    this.hesitationTimers.delete(id);
    if (start == null) return;
    const dwell = Date.now() - start;
    if (dwell >= this.config.hesitationMs) {
      this.hesitationCounts.set(id, (this.hesitationCounts.get(id) ?? 0) + 1);
    }
  }

  /** Aggregate clicks into heat points for visualization. */
  buildHeatPoints(gridSize = 20): HeatPoint[] {
    const grid = new Map<string, HeatPoint>();
    for (const c of this.clicks) {
      const gx = Math.min(gridSize - 1, Math.floor(c.x * gridSize));
      const gy = Math.min(gridSize - 1, Math.floor(c.y * gridSize));
      const key = `${gx}:${gy}`;
      const existing = grid.get(key);
      if (existing) {
        existing.weight += 1;
      } else {
        grid.set(key, {
          x: (gx + 0.5) / gridSize,
          y: (gy + 0.5) / gridSize,
          weight: 1,
          timestamp: c.timestamp,
          fieldId: c.fieldId,
        });
      }
    }
    return Array.from(grid.values()).sort((a, b) => b.weight - a.weight);
  }

  identifyProblemAreas(): ProblemArea[] {
    const areas: ProblemArea[] = [];

    // Rage clicks: many clicks in a short window on same field
    const byField = new Map<string, ClickEvent[]>();
    for (const c of this.clicks) {
      const key = c.fieldId ?? `_xy_${c.x.toFixed(2)}_${c.y.toFixed(2)}`;
      if (!byField.has(key)) byField.set(key, []);
      byField.get(key)!.push(c);
    }

    for (const [fieldId, clicks] of byField) {
      for (let i = 0; i < clicks.length; i++) {
        const windowClicks = clicks.filter(
          (c) =>
            Math.abs(c.timestamp - clicks[i].timestamp) <=
            this.config.rageClickWindowMs,
        );
        if (windowClicks.length >= this.config.rageClickThreshold) {
          areas.push({
            fieldId,
            issue: "rage_click",
            severity: "high",
            score: Math.min(1, windowClicks.length / 5),
            detail: `${windowClicks.length} clicks within ${this.config.rageClickWindowMs}ms`,
          });
          break;
        }
      }

      // Dead clicks on non-interactive tags
      const dead = clicks.filter((c) =>
        ["div", "span", "p", "label", "section"].includes(c.targetTag),
      );
      if (dead.length >= 2) {
        areas.push({
          fieldId,
          issue: "dead_click",
          severity: "medium",
          score: Math.min(1, dead.length / 4),
          detail: `${dead.length} clicks on non-interactive elements`,
        });
      }
    }

    for (const [fieldId, count] of this.hesitationCounts) {
      if (count > 0) {
        areas.push({
          fieldId,
          issue: "high_hesitation",
          severity: count > 2 ? "high" : "medium",
          score: Math.min(1, count / 3),
          detail: `${count} long hesitation(s) on field`,
        });
      }
    }

    const maxScroll = this.maxScrollDepth();
    if (maxScroll < 0.5 && this.clicks.length < 2) {
      areas.push({
        fieldId: "_form",
        issue: "scroll_abandon",
        severity: "medium",
        score: 1 - maxScroll,
        detail: `Max scroll depth only ${(maxScroll * 100).toFixed(0)}%`,
      });
    }

    if (this.clicks.length === 0 && this.mousePath.length < 5) {
      areas.push({
        fieldId: "_form",
        issue: "low_engagement",
        severity: "low",
        score: 0.4,
        detail: "Very little interaction recorded",
      });
    }

    return areas;
  }

  maxScrollDepth(): number {
    if (this.scrollSamples.length === 0) return 0;
    return Math.max(...this.scrollSamples.map((s) => s.depth));
  }

  snapshot(): HeatmapSnapshot {
    const rect = this.formEl?.getBoundingClientRect();
    const snap: HeatmapSnapshot = {
      formId: this.formId,
      formType: this.formType,
      sessionId: this.sessionId,
      clicks: [...this.clicks],
      scrollDepth: [...this.scrollSamples],
      maxScrollDepth: this.maxScrollDepth(),
      mousePath: [...this.mousePath],
      heatPoints: this.buildHeatPoints(),
      problemAreas: this.identifyProblemAreas(),
      startedAt: this.startedAt,
      endedAt: Date.now(),
      formWidth: rect?.width ?? 0,
      formHeight: rect?.height ?? 0,
    };

    if (this.config.persistLocally && typeof window !== "undefined") {
      try {
        const prev = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as HeatmapSnapshot[];
        const next = [...(Array.isArray(prev) ? prev : []), snap].slice(-20);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
    }

    return snap;
  }
}

export function loadStoredHeatmaps(): HeatmapSnapshot[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as HeatmapSnapshot[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function clearStoredHeatmaps(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export { DEFAULT_CONFIG };
