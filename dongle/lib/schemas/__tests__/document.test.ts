/**
 * Tests for form schema documentation generation (Issue #581).
 */

import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
  buildExamplePayload,
  documentSchema,
  render,
  renderHtml,
  renderJson,
  renderMarkdown,
} from "../document";

const sample = z.object({
  title: z.string().min(3).max(50),
  rating: z.number().int().min(1).max(5),
  email: z.string().email(),
  published: z.boolean(),
  status: z.enum(["draft", "live", "archived"]),
  note: z.string().optional(),
  tags: z.array(z.string()).max(5),
});

describe("documentSchema", () => {
  it("documents every field in the schema", () => {
    const doc = documentSchema(sample, "Sample");
    const paths = doc.fields.map((f) => f.path).sort();

    expect(paths).toEqual(
      ["email", "note", "published", "rating", "status", "tags", "title"],
    );
  });

  it("distinguishes required from optional", () => {
    const doc = documentSchema(sample, "Sample");
    const byPath = Object.fromEntries(doc.fields.map((f) => [f.path, f]));

    expect(byPath.title!.required).toBe(true);
    expect(byPath.note!.required).toBe(false);
  });

  it("reports length and range rules", () => {
    const doc = documentSchema(sample, "Sample");
    const byPath = Object.fromEntries(doc.fields.map((f) => [f.path, f]));

    expect(byPath.title!.rules).toContain("min length: 3");
    expect(byPath.title!.rules).toContain("max length: 50");
    expect(byPath.rating!.rules).toContain("≥ 1");
    expect(byPath.rating!.rules).toContain("≤ 5");
  });

  it("reports an integer constraint as a rule, not a type", () => {
    // JSON Schema calls it a type; someone filling in a form reads it as a rule.
    const doc = documentSchema(sample, "Sample");
    const rating = doc.fields.find((f) => f.path === "rating")!;

    expect(rating.type).toBe("number");
    expect(rating.rules).toContain("whole number");
  });

  it("lists enum values", () => {
    const doc = documentSchema(sample, "Sample");
    const status = doc.fields.find((f) => f.path === "status")!;

    expect(status.enumValues).toEqual(["draft", "live", "archived"]);
  });

  it("flattens nested objects to dotted paths", () => {
    const nested = z.object({
      name: z.string(),
      address: z.object({ city: z.string(), postcode: z.string().optional() }),
    });

    const paths = documentSchema(nested, "Nested").fields.map((f) => f.path);

    expect(paths).toContain("address");
    expect(paths).toContain("address.city");
    expect(paths).toContain("address.postcode");
  });

  it("documents the input shape, not the post-transform output", () => {
    // With the default `io: "output"`, a field with `.default()` documents as
    // already-present — backwards for docs telling a caller what to send.
    const withDefault = z.object({ page: z.number().default(1) });
    const doc = documentSchema(withDefault, "Defaults");
    const page = doc.fields.find((f) => f.path === "page")!;

    expect(page.required).toBe(false);
  });

  it("exposes the underlying JSON Schema", () => {
    const doc = documentSchema(sample, "Sample");
    expect(doc.jsonSchema).toHaveProperty("properties");
  });
});

describe("examples", () => {
  it("synthesises an example that satisfies the field's own rules", () => {
    // An example that would fail the validation printed beside it actively
    // misleads.
    const doc = documentSchema(sample, "Sample");
    const byPath = Object.fromEntries(doc.fields.map((f) => [f.path, f]));

    expect(String(byPath.title!.example).length).toBeGreaterThanOrEqual(3);
    expect(byPath.rating!.example).toBe(1);
    expect(byPath.email!.example).toBe("user@example.com");
    expect(byPath.status!.example).toBe("draft");
    expect(byPath.published!.example).toBe(true);
    expect(byPath.tags!.example).toEqual([]);
  });

  it("prefers a schema-supplied example over a synthesised one", () => {
    const described = z.object({
      code: z.string().meta({ examples: ["ABC-123"] }),
    });

    const doc = documentSchema(described, "Described");
    expect(doc.fields[0]!.example).toBe("ABC-123");
  });

  it("builds an example payload from required fields only", () => {
    // Including optionals reads as though they are all expected, contradicting
    // the Required column.
    const doc = documentSchema(sample, "Sample");
    const payload = buildExamplePayload(doc);

    expect(payload).toHaveProperty("title");
    expect(payload).toHaveProperty("rating");
    expect(payload).not.toHaveProperty("note");
  });

  it("nests an example payload for nested fields", () => {
    const nested = z.object({
      address: z.object({ city: z.string() }),
    });

    const payload = buildExamplePayload(documentSchema(nested, "Nested"));
    expect(payload.address).toMatchObject({ city: expect.any(String) });
  });

  it("produces an example payload that the schema itself accepts", () => {
    // The strongest form of the claim above: round-trip it through parse.
    const roundTrip = z.object({
      title: z.string().min(3).max(50),
      rating: z.number().int().min(1).max(5),
      email: z.string().email(),
      status: z.enum(["draft", "live"]),
    });

    const payload = buildExamplePayload(documentSchema(roundTrip, "RoundTrip"));
    expect(roundTrip.safeParse(payload).success).toBe(true);
  });
});

describe("renderers", () => {
  const doc = documentSchema(sample, "Sample", "A sample form.");

  it("renders a markdown table with every field", () => {
    const md = renderMarkdown(doc);

    expect(md).toContain("## Sample");
    expect(md).toContain("A sample form.");
    expect(md).toContain("| Field | Type | Required | Rules | Example |");
    for (const field of doc.fields) {
      expect(md).toContain(`\`${field.path}\``);
    }
  });

  it("includes an example payload block in markdown", () => {
    expect(renderMarkdown(doc)).toContain("### Example payload");
  });

  it("renders valid JSON", () => {
    const parsed = JSON.parse(renderJson(doc));

    expect(parsed.name).toBe("Sample");
    expect(Array.isArray(parsed.fields)).toBe(true);
    expect(parsed).toHaveProperty("jsonSchema");
    expect(parsed).toHaveProperty("example");
  });

  it("renders HTML with escaped content", () => {
    const risky = documentSchema(
      z.object({ q: z.string().meta({ description: "<script>alert(1)</script>" }) }),
      "Risky",
    );
    const html = renderHtml(risky);

    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("dispatches on format", () => {
    expect(render(doc, "markdown")).toContain("| Field |");
    expect(() => JSON.parse(render(doc, "json"))).not.toThrow();
    expect(render(doc, "html")).toContain("<table>");
  });

  it("handles a schema with no fields without throwing", () => {
    const empty = documentSchema(z.object({}), "Empty");

    expect(empty.fields).toEqual([]);
    expect(renderMarkdown(empty)).toContain("No documented fields");
    expect(() => JSON.parse(renderJson(empty))).not.toThrow();
  });
});

describe("the real review schema", () => {
  it("documents rating and comment with their constraints", async () => {
    const { reviewFormSchema } = await import("../review.schema");
    const doc = documentSchema(reviewFormSchema, "Review form");
    const paths = doc.fields.map((f) => f.path);

    expect(paths).toContain("rating");
    expect(paths).toContain("comment");

    const rating = doc.fields.find((f) => f.path === "rating")!;
    expect(rating.rules.some((r) => r.startsWith("≥"))).toBe(true);
    expect(rating.rules).toContain("whole number");
  });
});
