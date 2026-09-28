/**
 * Form Field Value Transformation on Submit (Issue #508)
 *
 * Allows defining, chaining, and applying transformations to field values
 * before form submission.
 *
 * Features:
 * - Built-in transforms (trim, toLowerCase, toUpperCase, capitalize, toNumber,
 *   toBoolean, stripTags, compactArray, dedupeArray, defaultTo, truncate, parseJson)
 * - Custom transformation functions
 * - Chainable transform builder and pipeline API
 * - Automatic integration on form submission (flat or nested fields)
 */

import { getNestedValue, setNestedValue } from "./nested-form";

export type TransformFn<TIn = any, TOut = any> = (
  value: TIn,
  key: string,
  allData: any
) => TOut;

export type TransformRule =
  | TransformFn
  | TransformPipeline
  | Array<TransformFn | TransformPipeline>;

export type TransformRulesMap = Record<string, TransformRule>;

/**
 * Built-in transform: Trims leading and trailing whitespace from strings.
 */
export function trim(): TransformFn<string | null | undefined, string> {
  return (value) => (typeof value === "string" ? value.trim() : (value as any));
}

/**
 * Built-in transform: Converts strings to lowercase.
 */
export function toLowerCase(): TransformFn<string | null | undefined, string> {
  return (value) => (typeof value === "string" ? value.toLowerCase() : (value as any));
}

/**
 * Built-in transform: Converts strings to uppercase.
 */
export function toUpperCase(): TransformFn<string | null | undefined, string> {
  return (value) => (typeof value === "string" ? value.toUpperCase() : (value as any));
}

/**
 * Built-in transform: Capitalizes the first character of a string.
 */
export function capitalize(): TransformFn<string | null | undefined, string> {
  return (value) => {
    if (typeof value !== "string" || value.length === 0) return (value as any);
    return value.charAt(0).toUpperCase() + value.slice(1);
  };
}

/**
 * Built-in transform: Capitalizes the first letter of each word.
 */
export function titleCase(): TransformFn<string | null | undefined, string> {
  return (value) => {
    if (typeof value !== "string" || value.length === 0) return (value as any);
    return value.replace(/\b\w/g, (char) => char.toUpperCase());
  };
}

/**
 * Built-in transform: Strips all whitespace characters.
 */
export function removeWhitespace(): TransformFn<string | null | undefined, string> {
  return (value) => (typeof value === "string" ? value.replace(/\s+/g, "") : (value as any));
}

/**
 * Built-in transform: Strips HTML tags from input string.
 */
export function stripTags(): TransformFn<string | null | undefined, string> {
  return (value) => (typeof value === "string" ? value.replace(/<[^>]*>/g, "") : (value as any));
}

/**
 * Built-in transform: Converts input to number.
 */
export function toNumber(options: { fallback?: number } = {}): TransformFn<any, number> {
  return (value) => {
    if (typeof value === "number") return isNaN(value) ? (options.fallback ?? NaN) : value;
    if (value == null || value === "") return options.fallback ?? NaN;
    const parsed = Number(value);
    return isNaN(parsed) ? (options.fallback ?? NaN) : parsed;
  };
}

/**
 * Built-in transform: Converts input to integer.
 */
export function toInteger(options: { radix?: number; fallback?: number } = {}): TransformFn<any, number> {
  const radix = options.radix ?? 10;
  return (value) => {
    if (typeof value === "number") return Math.trunc(value);
    if (value == null || value === "") return options.fallback ?? NaN;
    const parsed = parseInt(String(value), radix);
    return isNaN(parsed) ? (options.fallback ?? NaN) : parsed;
  };
}

/**
 * Built-in transform: Converts input to boolean.
 */
export function toBoolean(): TransformFn<any, boolean> {
  return (value) => {
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
      const lower = value.trim().toLowerCase();
      if (lower === "true" || lower === "1" || lower === "yes" || lower === "on") return true;
      if (lower === "false" || lower === "0" || lower === "no" || lower === "off" || lower === "") return false;
    }
    return Boolean(value);
  };
}

/**
 * Built-in transform: Provides a fallback default value if null, undefined, or empty string.
 */
export function defaultTo<T>(fallback: T): TransformFn<any, any> {
  return (value) => {
    if (value == null || (typeof value === "string" && value.trim() === "")) {
      return fallback;
    }
    return value;
  };
}

/**
 * Built-in transform: Removes null, undefined, and empty string elements from an array.
 */
export function compactArray<T = any>(): TransformFn<T[], T[]> {
  return (value) => {
    if (!Array.isArray(value)) return value;
    return value.filter((item) => item != null && item !== "");
  };
}

/**
 * Built-in transform: Deduplicates items in an array.
 */
export function dedupeArray<T = any>(): TransformFn<T[], T[]> {
  return (value) => {
    if (!Array.isArray(value)) return value;
    return Array.from(new Set(value));
  };
}

/**
 * Built-in transform: Truncates a string to maximum length with optional ellipsis.
 */
export function truncate(maxLength: number, ellipsis = "…"): TransformFn<string, string> {
  return (value) => {
    if (typeof value !== "string" || value.length <= maxLength) return value;
    return value.slice(0, maxLength) + ellipsis;
  };
}

/**
 * Built-in transform: Safely parses a JSON string.
 */
export function parseJson(fallback?: any): TransformFn<string, any> {
  return (value) => {
    if (typeof value !== "string") return value;
    try {
      return JSON.parse(value);
    } catch {
      return fallback !== undefined ? fallback : value;
    }
  };
}

/**
 * Custom transform wrapper.
 */
export function custom<TIn = any, TOut = any>(
  fn: (val: TIn, key: string, allData: any) => TOut
): TransformFn<TIn, TOut> {
  return fn;
}

/**
 * Chains multiple transform functions into a single pipeline function.
 */
export function chainTransforms(...transforms: Array<TransformFn | TransformPipeline>): TransformFn {
  const flattenedFns: TransformFn[] = [];

  for (const t of transforms) {
    if (t instanceof TransformPipeline) {
      flattenedFns.push(...t.getSteps());
    } else if (typeof t === "function") {
      flattenedFns.push(t);
    }
  }

  return (initialValue: any, key: string, allData: any) => {
    return flattenedFns.reduce((acc, fn) => fn(acc, key, allData), initialValue);
  };
}

/**
 * Fluent chainable transform builder.
 *
 * Example:
 * ```ts
 * const pipeline = TransformPipeline.create()
 *   .trim()
 *   .toLowerCase()
 *   .defaultTo("guest");
 * ```
 */
export class TransformPipeline {
  private steps: TransformFn[] = [];

  constructor(initialSteps: TransformFn[] = []) {
    this.steps = [...initialSteps];
  }

  static create(): TransformPipeline {
    return new TransformPipeline();
  }

  pipe(transform: TransformFn | TransformPipeline): this {
    if (transform instanceof TransformPipeline) {
      this.steps.push(...transform.getSteps());
    } else if (typeof transform === "function") {
      this.steps.push(transform);
    }
    return this;
  }

  trim(): this {
    return this.pipe(trim());
  }

  toLowerCase(): this {
    return this.pipe(toLowerCase());
  }

  toUpperCase(): this {
    return this.pipe(toUpperCase());
  }

  capitalize(): this {
    return this.pipe(capitalize());
  }

  titleCase(): this {
    return this.pipe(titleCase());
  }

  removeWhitespace(): this {
    return this.pipe(removeWhitespace());
  }

  stripTags(): this {
    return this.pipe(stripTags());
  }

  toNumber(options?: { fallback?: number }): this {
    return this.pipe(toNumber(options));
  }

  toInteger(options?: { radix?: number; fallback?: number }): this {
    return this.pipe(toInteger(options));
  }

  toBoolean(): this {
    return this.pipe(toBoolean());
  }

  defaultTo<T>(fallback: T): this {
    return this.pipe(defaultTo(fallback));
  }

  compactArray(): this {
    return this.pipe(compactArray());
  }

  dedupeArray(): this {
    return this.pipe(dedupeArray());
  }

  truncate(maxLength: number, ellipsis?: string): this {
    return this.pipe(truncate(maxLength, ellipsis));
  }

  custom<TIn = any, TOut = any>(fn: (val: TIn, key: string, allData: any) => TOut): this {
    return this.pipe(custom(fn));
  }

  getSteps(): TransformFn[] {
    return this.steps;
  }

  build(): TransformFn {
    return chainTransforms(...this.steps);
  }

  apply(value: any, key = "", allData: any = {}): any {
    return this.build()(value, key, allData);
  }
}

/**
 * Applies a set of transform rules to form data.
 * Supports flat field names as well as deep dot/bracket paths (e.g. `user.profile.name`).
 */
export function applyFieldTransforms<T extends Record<string, any>>(
  formData: T,
  rules: TransformRulesMap
): T {
  if (!formData || typeof formData !== "object") return formData;

  let result = Array.isArray(formData) ? [...formData] : { ...formData };

  for (const [path, rule] of Object.entries(rules)) {
    const rawVal = getNestedValue(result, path);
    const transformFn =
      rule instanceof TransformPipeline
        ? rule.build()
        : Array.isArray(rule)
        ? chainTransforms(...rule)
        : rule;

    const transformed = transformFn(rawVal, path, result);
    result = setNestedValue(result, path, transformed);
  }

  return result as T;
}

/**
 * Form submit handler wrapper that automatically applies field transformations
 * right before executing the user's submit callback.
 */
export function createTransformSubmitHandler<T extends Record<string, any>>(
  onSubmit: (transformedData: T) => Promise<any> | any,
  rules: TransformRulesMap
) {
  return async (data: T) => {
    const transformed = applyFieldTransforms(data, rules);
    return await onSubmit(transformed);
  };
}
