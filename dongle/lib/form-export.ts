/**
 * Form data export (Issue #537).
 *
 * Serializes form values into downloadable files. Delimited formats (CSV, TSV)
 * follow RFC 4180 quoting and are prefixed with a UTF-8 BOM so spreadsheet apps
 * detect the encoding of non-ASCII input. JSON keeps nested values intact for
 * lossless round-trips.
 *
 * Cells that a spreadsheet would evaluate as a formula (leading `=`, `+`, `-`,
 * `@`, tab or carriage return) are prefixed with a single quote — user-entered
 * form text must never execute when the export is opened in Excel or Sheets.
 */

export type FormExportFormat = "csv" | "csv-semicolon" | "tsv" | "json";

export type FormExportValue = string | number | boolean | null | undefined | FormExportValue[];

export type FormExportRecord = Record<string, FormExportValue>;

export interface FormExportFormatOption {
  value: FormExportFormat;
  label: string;
  extension: string;
  mimeType: string;
}

export const FORM_EXPORT_FORMATS: readonly FormExportFormatOption[] = [
  { value: "csv", label: "CSV (comma)", extension: "csv", mimeType: "text/csv;charset=utf-8" },
  {
    value: "csv-semicolon",
    label: "CSV (semicolon, Excel EU)",
    extension: "csv",
    mimeType: "text/csv;charset=utf-8",
  },
  {
    value: "tsv",
    label: "TSV (tab)",
    extension: "tsv",
    mimeType: "text/tab-separated-values;charset=utf-8",
  },
  { value: "json", label: "JSON", extension: "json", mimeType: "application/json;charset=utf-8" },
];

const DELIMITERS: Record<Exclude<FormExportFormat, "json">, string> = {
  csv: ",",
  "csv-semicolon": ";",
  tsv: "\t",
};

/** Separator used to flatten array values into a single delimited cell. */
export const ARRAY_VALUE_SEPARATOR = " | ";

const BOM = "﻿";
const FORMULA_TRIGGER = /^[=+\-@\t\r]/;

export interface FormExportOptions {
  /** Column order. Defaults to the key order of the first record. */
  fields?: string[];
  /** Human-readable header per field. Falls back to the field name. */
  labels?: Record<string, string>;
  /** Prefix delimited output with a UTF-8 BOM. Default: true. */
  includeBom?: boolean;
}

export function getFormatOption(format: FormExportFormat): FormExportFormatOption {
  const option = FORM_EXPORT_FORMATS.find((f) => f.value === format);
  if (!option) throw new Error(`Unsupported export format: ${format}`);
  return option;
}

function stringifyValue(value: FormExportValue): string {
  if (value == null) return "";
  if (Array.isArray(value)) {
    return value
      .map(stringifyValue)
      .filter((v) => v !== "")
      .join(ARRAY_VALUE_SEPARATOR);
  }
  return String(value);
}

/** Neutralises spreadsheet formula injection. Numbers are left as numbers. */
export function sanitizeCell(value: string): string {
  return FORMULA_TRIGGER.test(value) && !/^[+-]?\d+(\.\d+)?$/.test(value) ? `'${value}` : value;
}

/** Quotes a cell when it contains the delimiter, a quote, or a line break. */
export function escapeDelimitedCell(value: string, delimiter: string): string {
  const needsQuoting =
    value.includes(delimiter) || value.includes('"') || value.includes("\n") || value.includes("\r");
  return needsQuoting ? `"${value.replace(/"/g, '""')}"` : value;
}

function resolveFields(records: FormExportRecord[], fields?: string[]): string[] {
  if (fields?.length) return fields;
  const seen = new Set<string>();
  for (const record of records) {
    for (const key of Object.keys(record)) seen.add(key);
  }
  return [...seen];
}

export function toDelimited(
  records: FormExportRecord[],
  delimiter: string,
  options: FormExportOptions = {},
): string {
  const fields = resolveFields(records, options.fields);
  const encode = (raw: string) => escapeDelimitedCell(sanitizeCell(raw), delimiter);

  const header = fields.map((f) => encode(options.labels?.[f] ?? f)).join(delimiter);
  const rows = records.map((record) =>
    fields.map((f) => encode(stringifyValue(record[f]))).join(delimiter),
  );

  const body = [header, ...rows].join("\r\n") + "\r\n";
  return (options.includeBom ?? true) ? BOM + body : body;
}

export function toJson(records: FormExportRecord[], options: FormExportOptions = {}): string {
  const fields = resolveFields(records, options.fields);
  const picked = records.map((record) =>
    Object.fromEntries(fields.map((f) => [f, record[f] ?? null])),
  );
  return JSON.stringify(picked.length === 1 ? picked[0] : picked, null, 2) + "\n";
}

/** Serializes one or more form records into the requested format. */
export function serializeFormData(
  data: FormExportRecord | FormExportRecord[],
  format: FormExportFormat,
  options: FormExportOptions = {},
): string {
  const records = Array.isArray(data) ? data : [data];
  if (format === "json") return toJson(records, options);
  return toDelimited(records, DELIMITERS[format], options);
}

/** Strips characters that are invalid in filenames on common platforms. */
export function sanitizeFilename(name: string): string {
  const cleaned = name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 100);
  return cleaned || "form-data";
}

export function buildExportFilename(
  baseName: string,
  format: FormExportFormat,
  date: Date = new Date(),
): string {
  const stamp = date.toISOString().slice(0, 10);
  return `${sanitizeFilename(baseName)}-${stamp}.${getFormatOption(format).extension}`;
}

/**
 * Triggers a browser download. The anchor is attached to the document (Firefox
 * ignores clicks on detached anchors) and the object URL is revoked on the next
 * tick so the download has started before the blob is released.
 */
export function downloadFile(filename: string, content: string, mimeType: string): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** Serializes form data and downloads it. Returns the filename used. */
export function exportFormData(
  data: FormExportRecord | FormExportRecord[],
  format: FormExportFormat,
  baseName: string,
  options: FormExportOptions = {},
): string {
  const filename = buildExportFilename(baseName, format);
  const content = serializeFormData(data, format, options);
  downloadFile(filename, content, getFormatOption(format).mimeType);
  return filename;
}
