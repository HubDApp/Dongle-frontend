import { describe, it, expect, vi, afterEach } from "vitest";
import {
  FORM_EXPORT_FORMATS,
  buildExportFilename,
  downloadFile,
  escapeDelimitedCell,
  exportFormData,
  sanitizeCell,
  sanitizeFilename,
  serializeFormData,
} from "@/lib/form-export";

const BOM = "﻿";

describe("serializeFormData — CSV", () => {
  it("writes a BOM, a header row and a data row with CRLF line endings", () => {
    const csv = serializeFormData({ name: "Soroban Swap", rating: 5 }, "csv");
    expect(csv).toBe(`${BOM}name,rating\r\nSoroban Swap,5\r\n`);
  });

  it("uses labels for headers and respects field order", () => {
    const csv = serializeFormData({ a: "1", b: "2" }, "csv", {
      fields: ["b", "a"],
      labels: { a: "Alpha", b: "Beta" },
      includeBom: false,
    });
    expect(csv).toBe("Beta,Alpha\r\n2,1\r\n");
  });

  it("quotes commas, quotes and line breaks", () => {
    const csv = serializeFormData(
      { text: 'He said "hi", then\nleft' },
      "csv",
      { includeBom: false },
    );
    expect(csv).toBe('text\r\n"He said ""hi"", then\nleft"\r\n');
  });

  it("preserves unicode and emoji", () => {
    const csv = serializeFormData({ name: "Café 🚀 日本" }, "csv", { includeBom: false });
    expect(csv).toBe("name\r\nCafé 🚀 日本\r\n");
  });

  it("flattens arrays and renders null/undefined as empty", () => {
    const csv = serializeFormData(
      { tags: ["defi", "", "dex"], a: null, b: undefined, ok: true },
      "csv",
      { includeBom: false },
    );
    expect(csv).toBe("tags,a,b,ok\r\ndefi | dex,,,true\r\n");
  });

  it("neutralises formula injection", () => {
    const csv = serializeFormData({ x: "=HYPERLINK(\"http://evil\")" }, "csv", { includeBom: false });
    expect(csv).toBe(`x\r\n"'=HYPERLINK(""http://evil"")"\r\n`);
  });

  it("exports multiple records with the union of keys", () => {
    const csv = serializeFormData([{ a: 1 }, { b: 2 }], "csv", { includeBom: false });
    expect(csv).toBe("a,b\r\n1,\r\n,2\r\n");
  });
});

describe("serializeFormData — other formats", () => {
  it("uses semicolons and quotes cells containing them", () => {
    const out = serializeFormData({ a: "x;y", b: "1,5" }, "csv-semicolon", { includeBom: false });
    expect(out).toBe('a;b\r\n"x;y";1,5\r\n');
  });

  it("uses tabs for TSV", () => {
    const out = serializeFormData({ a: "x", b: "y\tz" }, "tsv", { includeBom: false });
    expect(out).toBe('a\tb\r\nx\t"y\tz"\r\n');
  });

  it("keeps structure in JSON and only includes selected fields", () => {
    const out = serializeFormData({ tags: ["a", "b"], secret: "no", name: "N" }, "json", {
      fields: ["name", "tags"],
    });
    expect(JSON.parse(out)).toEqual({ name: "N", tags: ["a", "b"] });
  });

  it("emits a JSON array for multiple records", () => {
    const out = serializeFormData([{ a: 1 }, { a: 2 }], "json");
    expect(JSON.parse(out)).toEqual([{ a: 1 }, { a: 2 }]);
  });
});

describe("cell helpers", () => {
  it("sanitizeCell leaves plain numbers alone", () => {
    expect(sanitizeCell("-12.5")).toBe("-12.5");
    expect(sanitizeCell("+3")).toBe("+3");
    expect(sanitizeCell("@SUM(A1)")).toBe("'@SUM(A1)");
    expect(sanitizeCell("-1+2")).toBe("'-1+2");
    expect(sanitizeCell("hello")).toBe("hello");
  });

  it("escapeDelimitedCell only quotes when needed", () => {
    expect(escapeDelimitedCell("plain", ",")).toBe("plain");
    expect(escapeDelimitedCell("a\rb", ",")).toBe('"a\rb"');
  });
});

describe("filenames", () => {
  it("sanitizes unsafe characters", () => {
    expect(sanitizeFilename("../My Café: Project?")).toBe("My-Cafe-Project");
    expect(sanitizeFilename("///")).toBe("form-data");
  });

  it("appends date and extension per format", () => {
    const date = new Date("2026-09-28T12:00:00Z");
    expect(buildExportFilename("Soroban Swap", "csv", date)).toBe("Soroban-Swap-2026-09-28.csv");
    expect(buildExportFilename("x", "tsv", date)).toBe("x-2026-09-28.tsv");
    expect(buildExportFilename("x", "json", date)).toBe("x-2026-09-28.json");
  });

  it("every format has a mime type and extension", () => {
    for (const f of FORM_EXPORT_FORMATS) {
      expect(f.extension).toBeTruthy();
      expect(f.mimeType).toMatch(/charset=utf-8/);
    }
  });
});

describe("downloadFile", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("clicks an attached anchor and revokes the object URL afterwards", async () => {
    vi.useFakeTimers();
    const createObjectURL = vi.fn(() => "blob:mock");
    const revokeObjectURL = vi.fn();
    Object.assign(URL, { createObjectURL, revokeObjectURL });

    let clicked: HTMLAnchorElement | null = null;
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      expect(document.body.contains(this)).toBe(true);
      clicked = this;
    });

    downloadFile("out.csv", "a,b", "text/csv;charset=utf-8");

    expect(clicked).not.toBeNull();
    expect(clicked!.download).toBe("out.csv");
    expect(clicked!.href).toBe("blob:mock");
    expect(document.body.contains(clicked)).toBe(false);
    const blob = (createObjectURL.mock.calls[0] as unknown as [Blob])[0];
    expect(blob.type).toBe("text/csv;charset=utf-8");

    expect(revokeObjectURL).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:mock");
  });

  it("exportFormData returns the generated filename", () => {
    Object.assign(URL, { createObjectURL: vi.fn(() => "blob:x"), revokeObjectURL: vi.fn() });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    const name = exportFormData({ a: 1 }, "json", "My Form");
    expect(name).toMatch(/^My-Form-\d{4}-\d{2}-\d{2}\.json$/);
  });
});
