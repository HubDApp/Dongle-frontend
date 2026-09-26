/**
 * Form schema documentation generation (Issue #581).
 *
 * Turns a Zod schema into a field-by-field description that can be rendered as
 * Markdown, JSON, or HTML. The point is that the docs are *derived*: a field
 * added to a schema appears in the documentation without anyone remembering to
 * write it down, and a constraint that changes cannot silently disagree with
 * what the docs claim.
 *
 * # Why this goes through `z.toJSONSchema`
 *
 * Zod 4 exposes a public `z.toJSONSchema()`. Walking Zod's own internals
 * (`_def` in v3, `._zod.def` in v4) would read more constraints, but those
 * shapes are unstable across minor versions and a docs generator that breaks on
 * a patch bump is worse than one that documents slightly less.
 *
 * JSON Schema is also a useful intermediate in its own right: it is the `json`
 * output format, and it is what a consumer would want for codegen or for an
 * OpenAPI document.
 */

import { z } from "zod";

/** A documented field, flattened out of a possibly nested schema. */
export interface FieldDoc {
  /** Dotted path — `address.city` for a nested object. */
  path: string;
  /** JSON Schema type, or `union` / `unknown` when it cannot be reduced to one. */
  type: string;
  required: boolean;
  description?: string;
  /** Human-readable constraints, e.g. `min length: 3`, `≤ 5`, `pattern: /^G/`. */
  rules: string[];
  /** Allowed values for an enum or literal union. */
  enumValues?: string[];
  /** Example value, taken from the schema when present or synthesised. */
  example: unknown;
}

export interface SchemaDoc {
  name: string;
  description?: string;
  fields: FieldDoc[];
  /** The JSON Schema the fields were derived from. */
  jsonSchema: Record<string, unknown>;
}

type JsonSchemaNode = Record<string, unknown>;

/**
 * Renders one JSON Schema node's validation keywords as readable rules.
 *
 * Only keywords that constrain a *value* are listed. `type` is reported
 * separately, and annotations like `title` are not rules.
 */
function describeRules(node: JsonSchemaNode): string[] {
  const rules: string[] = [];
  const n = node as Record<string, number | string | boolean | undefined>;

  if (typeof n.minLength === "number") rules.push(`min length: ${n.minLength}`);
  if (typeof n.maxLength === "number") rules.push(`max length: ${n.maxLength}`);
  if (typeof n.minimum === "number") rules.push(`≥ ${n.minimum}`);
  if (typeof n.maximum === "number") rules.push(`≤ ${n.maximum}`);
  if (typeof n.exclusiveMinimum === "number") rules.push(`> ${n.exclusiveMinimum}`);
  if (typeof n.exclusiveMaximum === "number") rules.push(`< ${n.exclusiveMaximum}`);
  if (typeof n.multipleOf === "number") rules.push(`multiple of ${n.multipleOf}`);
  if (typeof n.pattern === "string") rules.push(`pattern: \`${n.pattern}\``);
  if (typeof n.format === "string") rules.push(`format: ${n.format}`);
  if (typeof n.minItems === "number") rules.push(`min items: ${n.minItems}`);
  if (typeof n.maxItems === "number") rules.push(`max items: ${n.maxItems}`);
  if (n.uniqueItems === true) rules.push("items must be unique");

  // `integer` arrives as a type in JSON Schema, but reads as a rule to someone
  // filling in a form.
  if (n.type === "integer") rules.push("whole number");

  return rules;
}

/** Enum / const values, if the node names a closed set. */
function describeEnum(node: JsonSchemaNode): string[] | undefined {
  if (Array.isArray(node.enum)) {
    return node.enum.map((v) => String(v));
  }
  if (node.const !== undefined) {
    return [String(node.const)];
  }
  // A union of literals comes out as anyOf/oneOf of consts.
  for (const key of ["anyOf", "oneOf"] as const) {
    const branches = node[key];
    if (Array.isArray(branches)) {
      const consts = branches
        .filter((b): b is JsonSchemaNode => typeof b === "object" && b !== null)
        .map((b) => b.const)
        .filter((c) => c !== undefined);
      if (consts.length === branches.length && consts.length > 0) {
        return consts.map((c) => String(c));
      }
    }
  }
  return undefined;
}

/** Reduces a node to a single type name for the docs table. */
function describeType(node: JsonSchemaNode): string {
  if (typeof node.type === "string") {
    return node.type === "integer" ? "number" : node.type;
  }
  if (Array.isArray(node.type)) {
    return node.type.join(" | ");
  }
  if (node.enum !== undefined || node.const !== undefined) return "enum";
  if (node.anyOf || node.oneOf) return "union";
  return "unknown";
}

/**
 * Synthesises an example for a field.
 *
 * Uses the schema's own `examples`/`default` when present — a hand-written
 * example is always better than a generated one. Otherwise derives a value that
 * *satisfies the constraints*, because an example that would fail the
 * validation it sits next to actively misleads.
 */
function synthesiseExample(node: JsonSchemaNode, path: string): unknown {
  if (Array.isArray(node.examples) && node.examples.length > 0) return node.examples[0];
  if (node.default !== undefined) return node.default;

  const enumValues = describeEnum(node);
  if (enumValues && enumValues.length > 0) return enumValues[0];

  const type = describeType(node);
  const n = node as Record<string, number | string | undefined>;

  switch (type) {
    case "string": {
      if (n.format === "email") return "user@example.com";
      if (n.format === "uri" || n.format === "url") return "https://example.com";
      if (n.format === "uuid") return "00000000-0000-4000-8000-000000000000";
      if (n.format === "date-time") return new Date(0).toISOString();

      const leaf = path.split(".").pop() ?? "value";
      const min = typeof n.minLength === "number" ? n.minLength : 0;
      const max = typeof n.maxLength === "number" ? n.maxLength : Infinity;

      // Pad or clip so the example honours the length bounds it is shown beside.
      let sample = leaf;
      if (sample.length < min) sample = sample.padEnd(min, "x");
      if (sample.length > max) sample = sample.slice(0, max);
      return sample;
    }
    case "number": {
      if (typeof n.minimum === "number") return n.minimum;
      if (typeof n.exclusiveMinimum === "number") return Number(n.exclusiveMinimum) + 1;
      if (typeof n.maximum === "number") return n.maximum;
      return 0;
    }
    case "boolean":
      return true;
    case "array":
      return [];
    case "object":
      return {};
    default:
      return null;
  }
}

/**
 * Flattens a JSON Schema object into dotted-path field docs.
 *
 * Nested objects are flattened rather than nested, so the output is a flat table
 * — which is what someone filling in a form or writing an API client actually
 * reads. The nested structure is still available in `jsonSchema`.
 */
function collectFields(
  node: JsonSchemaNode,
  prefix = "",
  depth = 0,
): FieldDoc[] {
  if (depth > 8) return [];

  const properties = node.properties;
  if (typeof properties !== "object" || properties === null) return [];

  const requiredList = Array.isArray(node.required) ? node.required.map(String) : [];
  const fields: FieldDoc[] = [];

  for (const [key, rawChild] of Object.entries(properties as Record<string, unknown>)) {
    if (typeof rawChild !== "object" || rawChild === null) continue;
    const child = rawChild as JsonSchemaNode;
    const path = prefix ? `${prefix}.${key}` : key;

    const field: FieldDoc = {
      path,
      type: describeType(child),
      required: requiredList.includes(key),
      description: typeof child.description === "string" ? child.description : undefined,
      rules: describeRules(child),
      enumValues: describeEnum(child),
      example: synthesiseExample(child, path),
    };
    fields.push(field);

    // Recurse into nested objects. An array's `items` is described by its own
    // rules rather than flattened, since `tags.0.name` is not a field a form
    // renders.
    if (child.type === "object" && child.properties) {
      fields.push(...collectFields(child, path, depth + 1));
    }
  }

  return fields;
}

/**
 * Documents a Zod schema.
 *
 * @param name label for the schema, used as the document heading
 */
export function documentSchema(
  schema: z.ZodType,
  name: string,
  description?: string,
): SchemaDoc {
  // `io: "input"` documents what a caller must *send*. With the default
  // ("output") a field carrying `.transform()` or `.default()` is described by
  // its post-parse shape — so a schema with `.default()` would document a
  // required field as optional-with-a-value, which is backwards for form docs.
  const jsonSchema = z.toJSONSchema(schema, {
    io: "input",
    unrepresentable: "any",
  }) as JsonSchemaNode;

  return {
    name,
    description,
    fields: collectFields(jsonSchema),
    jsonSchema,
  };
}

function formatExample(value: unknown): string {
  if (typeof value === "string") return `"${value}"`;
  if (value === null) return "null";
  if (Array.isArray(value) || typeof value === "object") return JSON.stringify(value);
  return String(value);
}

/** Renders a schema doc as Markdown. */
export function renderMarkdown(doc: SchemaDoc): string {
  const lines: string[] = [];

  lines.push(`## ${doc.name}`, "");
  if (doc.description) lines.push(doc.description, "");

  if (doc.fields.length === 0) {
    lines.push("_No documented fields._", "");
    return lines.join("\n");
  }

  lines.push("| Field | Type | Required | Rules | Example |");
  lines.push("|---|---|:---:|---|---|");

  for (const field of doc.fields) {
    const rules = [...field.rules];
    if (field.enumValues) {
      rules.unshift(`one of: ${field.enumValues.map((v) => `\`${v}\``).join(", ")}`);
    }
    lines.push(
      `| \`${field.path}\` | ${field.type} | ${field.required ? "yes" : "no"} | ` +
        `${rules.length > 0 ? rules.join("<br>") : "—"} | \`${formatExample(field.example)}\` |`,
    );
  }

  lines.push("");

  const described = doc.fields.filter((f) => f.description);
  if (described.length > 0) {
    lines.push("### Field notes", "");
    for (const field of described) {
      lines.push(`- **\`${field.path}\`** — ${field.description}`);
    }
    lines.push("");
  }

  lines.push("### Example payload", "");
  lines.push("```json");
  lines.push(JSON.stringify(buildExamplePayload(doc), null, 2));
  lines.push("```", "");

  return lines.join("\n");
}

/**
 * Assembles a single example object from the per-field examples.
 *
 * Only required fields are included. An example carrying every optional field
 * reads as though all of them are expected, which is the opposite of what the
 * `Required` column says two lines above it.
 */
export function buildExamplePayload(doc: SchemaDoc): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  for (const field of doc.fields) {
    if (!field.required) continue;
    const segments = field.path.split(".");

    // Nested objects are already emitted as their own field, so skip the
    // container and let its children populate it.
    let cursor = payload;
    for (let i = 0; i < segments.length - 1; i += 1) {
      const segment = segments[i]!;
      if (typeof cursor[segment] !== "object" || cursor[segment] === null) {
        cursor[segment] = {};
      }
      cursor = cursor[segment] as Record<string, unknown>;
    }

    const leaf = segments[segments.length - 1]!;
    if (field.type === "object") {
      if (typeof cursor[leaf] !== "object" || cursor[leaf] === null) cursor[leaf] = {};
    } else {
      cursor[leaf] = field.example;
    }
  }

  return payload;
}

/** Renders a schema doc as JSON — the machine-readable format. */
export function renderJson(doc: SchemaDoc): string {
  return JSON.stringify(
    {
      name: doc.name,
      description: doc.description,
      fields: doc.fields,
      example: buildExamplePayload(doc),
      jsonSchema: doc.jsonSchema,
    },
    null,
    2,
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Renders a schema doc as a standalone HTML fragment. */
export function renderHtml(doc: SchemaDoc): string {
  const rows = doc.fields
    .map((field) => {
      const rules = [...field.rules];
      if (field.enumValues) {
        rules.unshift(`one of: ${field.enumValues.join(", ")}`);
      }
      return `      <tr>
        <td><code>${escapeHtml(field.path)}</code></td>
        <td>${escapeHtml(field.type)}</td>
        <td>${field.required ? "yes" : "no"}</td>
        <td>${rules.map(escapeHtml).join("<br>")}</td>
        <td><code>${escapeHtml(formatExample(field.example))}</code></td>
      </tr>`;
    })
    .join("\n");

  return `<section class="schema-doc">
  <h2>${escapeHtml(doc.name)}</h2>
${doc.description ? `  <p>${escapeHtml(doc.description)}</p>\n` : ""}  <table>
    <thead>
      <tr><th>Field</th><th>Type</th><th>Required</th><th>Rules</th><th>Example</th></tr>
    </thead>
    <tbody>
${rows}
    </tbody>
  </table>
  <h3>Example payload</h3>
  <pre><code>${escapeHtml(JSON.stringify(buildExamplePayload(doc), null, 2))}</code></pre>
</section>`;
}

export type DocFormat = "markdown" | "json" | "html";

/** Renders a schema doc in the requested format. */
export function render(doc: SchemaDoc, format: DocFormat): string {
  switch (format) {
    case "json":
      return renderJson(doc);
    case "html":
      return renderHtml(doc);
    case "markdown":
    default:
      return renderMarkdown(doc);
  }
}
