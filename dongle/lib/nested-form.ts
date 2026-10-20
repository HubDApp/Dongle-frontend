/**
 * Nested Form Support (Issue #506)
 *
 * Provides utilities for handling complex nested objects and nested arrays
 * within form state, validation, and submission:
 * - Nested path accessors (dot and bracket notation, e.g. `user.profile.name`, `links[0].url`)
 * - Deep validation with schema support and path-based error formatting
 * - Nested array manipulation (insert, remove, move)
 * - Flattening nested form data on submit (e.g. for API/URL-encoded submissions)
 * - Unflattening flattened data back into nested object/array trees
 */

import { z } from "zod";

export type PathSegment = string | number;

export interface FlattenOptions {
  /** Delimiter for nested object keys. Default: '.' */
  delimiter?: string;
  /** Format for array indices: 'bracket' (e.g. `links[0].url`) or 'dot' (e.g. `links.0.url`). Default: 'bracket' */
  arrayNotation?: "bracket" | "dot";
  /** Do not flatten specialized types such as Date, File, Blob, or RegExp. Default: true */
  preserveSpecialTypes?: boolean;
}

export interface UnflattenOptions {
  /** Delimiter used in the flat keys. Default: '.' */
  delimiter?: string;
}

export interface NestedValidationResult<T = any> {
  success: boolean;
  data?: T;
  /** Error messages keyed by field path (e.g. `members[0].email`) */
  errors: Record<string, string>;
}

/**
 * Parses a string path (e.g. "user.profile.name", "members[0].email", "items.1.id")
 * into an array of path segments.
 */
export function parsePath(path: string): PathSegment[] {
  if (!path || typeof path !== "string") return [];

  const segments: PathSegment[] = [];
  // Tokenize dot notation and brackets: e.g. a.b[0].c
  const regex = /[^.[\]]+|\[(\d+)\]/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(path)) !== null) {
    const raw = match[0];
    if (raw.startsWith("[") && raw.endsWith("]")) {
      const idx = parseInt(raw.slice(1, -1), 10);
      segments.push(isNaN(idx) ? raw : idx);
    } else {
      const num = Number(raw);
      if (!isNaN(num) && Number.isInteger(num) && String(num) === raw) {
        segments.push(num);
      } else {
        segments.push(raw);
      }
    }
  }

  return segments;
}

/**
 * Safely retrieves a value at a given nested path.
 */
export function getNestedValue<T = any>(obj: any, path: string | PathSegment[], defaultValue?: T): T {
  if (obj == null) return defaultValue as T;

  const segments = Array.isArray(path) ? path : parsePath(path);
  let current = obj;

  for (const seg of segments) {
    if (current == null) return defaultValue as T;
    current = current[seg];
  }

  return current !== undefined ? current : (defaultValue as T);
}

/**
 * Safely sets a value at a given nested path, creating intermediate objects or arrays as needed.
 * Returns a new cloned object without mutating the original.
 */
export function setNestedValue<T = any>(obj: T, path: string | PathSegment[], value: any): T {
  const segments = Array.isArray(path) ? path : parsePath(path);
  if (segments.length === 0) return value;

  const root = Array.isArray(obj) ? [...(obj as any[])] : { ...obj };
  let current: any = root;

  for (let i = 0; i < segments.length - 1; i++) {
    const seg = segments[i];
    const nextSeg = segments[i + 1];

    if (current[seg] == null || typeof current[seg] !== "object") {
      current[seg] = typeof nextSeg === "number" ? [] : {};
    } else {
      current[seg] = Array.isArray(current[seg]) ? [...current[seg]] : { ...current[seg] };
    }

    current = current[seg];
  }

  const lastSeg = segments[segments.length - 1];
  current[lastSeg] = value;

  return root as T;
}

/**
 * Deletes a property or array item at a given nested path.
 */
export function deleteNestedValue<T = any>(obj: T, path: string | PathSegment[]): T {
  const segments = Array.isArray(path) ? path : parsePath(path);
  if (segments.length === 0 || obj == null) return obj;

  const root = Array.isArray(obj) ? [...(obj as any[])] : { ...obj };
  let current: any = root;

  for (let i = 0; i < segments.length - 1; i++) {
    const seg = segments[i];
    if (current[seg] == null || typeof current[seg] !== "object") {
      return root as T;
    }
    current[seg] = Array.isArray(current[seg]) ? [...current[seg]] : { ...current[seg] };
    current = current[seg];
  }

  const lastSeg = segments[segments.length - 1];
  if (Array.isArray(current) && typeof lastSeg === "number") {
    current.splice(lastSeg, 1);
  } else if (current && typeof current === "object") {
    delete current[lastSeg];
  }

  return root as T;
}

/**
 * Checks whether a path exists in an object.
 */
export function hasNestedPath(obj: any, path: string | PathSegment[]): boolean {
  if (obj == null) return false;
  const segments = Array.isArray(path) ? path : parsePath(path);
  let current = obj;

  for (const seg of segments) {
    if (current == null || typeof current !== "object" || !(seg in current)) {
      return false;
    }
    current = current[seg];
  }

  return true;
}

/**
 * Flattens deeply nested objects and arrays into a flat dictionary on form submission.
 *
 * Example:
 *   flattenFormData({ user: { address: { street: "High St" } }, tags: ["stellar", "web3"] })
 * Returns:
 *   {
 *     "user.address.street": "High St",
 *     "tags[0]": "stellar",
 *     "tags[1]": "web3"
 *   }
 */
export function flattenFormData(
  data: any,
  options: FlattenOptions = {}
): Record<string, any> {
  const {
    delimiter = ".",
    arrayNotation = "bracket",
    preserveSpecialTypes = true,
  } = options;

  const result: Record<string, any> = {};

  function isSpecialType(val: any): boolean {
    if (!val || typeof val !== "object") return false;
    if (val instanceof Date) return true;
    if (val instanceof RegExp) return true;
    if (typeof File !== "undefined" && val instanceof File) return true;
    if (typeof Blob !== "undefined" && val instanceof Blob) return true;
    return false;
  }

  function recurse(current: any, prefix: string) {
    if (current == null) {
      if (prefix) result[prefix] = current;
      return;
    }

    if (preserveSpecialTypes && isSpecialType(current)) {
      result[prefix] = current;
      return;
    }

    if (Array.isArray(current)) {
      if (current.length === 0) {
        if (prefix) result[prefix] = [];
        return;
      }
      current.forEach((item, index) => {
        const itemKey =
          arrayNotation === "bracket"
            ? `${prefix}[${index}]`
            : `${prefix}${delimiter}${index}`;
        recurse(item, itemKey);
      });
      return;
    }

    if (typeof current === "object") {
      const keys = Object.keys(current);
      if (keys.length === 0) {
        if (prefix) result[prefix] = {};
        return;
      }
      keys.forEach((key) => {
        const fullKey = prefix ? `${prefix}${delimiter}${key}` : key;
        recurse(current[key], fullKey);
      });
      return;
    }

    result[prefix] = current;
  }

  recurse(data, "");
  return result;
}

/**
 * Reconstructs a deeply nested object from a flattened record.
 */
export function unflattenFormData(
  flatData: Record<string, any>,
  _options: UnflattenOptions = {}
): any {
  if (!flatData || typeof flatData !== "object") return flatData;

  let result: any = null;

  for (const [key, value] of Object.entries(flatData)) {
    const segments = parsePath(key);
    if (segments.length === 0) continue;

    if (result === null) {
      result = typeof segments[0] === "number" ? [] : {};
    }

    result = setNestedValue(result, segments, value);
  }

  return result ?? {};
}

/**
 * Validates nested form data against a Zod schema, formatting errors into
 * nested path keys (e.g. `members[0].name`).
 */
export function validateNestedForm<T>(
  data: any,
  schema: z.ZodType<T>,
  options: { arrayNotation?: "bracket" | "dot" } = {}
): NestedValidationResult<T> {
  const parseResult = schema.safeParse(data);
  const arrayNotation = options.arrayNotation ?? "bracket";

  if (parseResult.success) {
    return {
      success: true,
      data: parseResult.data,
      errors: {},
    };
  }

  const errors: Record<string, string> = {};

  for (const issue of parseResult.error.issues) {
    let pathKey = "";
    for (let i = 0; i < issue.path.length; i++) {
      const seg = issue.path[i];
      if (typeof seg === "number") {
        pathKey += arrayNotation === "bracket" ? `[${seg}]` : `.${seg}`;
      } else {
        pathKey += pathKey.length > 0 ? `.${String(seg)}` : String(seg);
      }
    }

    // Retain first error per field
    if (pathKey && !errors[pathKey]) {
      errors[pathKey] = issue.message;
    } else if (!pathKey && !errors["_root"]) {
      errors["_root"] = issue.message;
    }
  }

  return {
    success: false,
    errors,
  };
}

/**
 * Array manipulation helper: Inserts an item into a nested array at a path.
 */
export function insertNestedArrayItem<T = any>(
  obj: T,
  arrayPath: string,
  item: any,
  index?: number
): T {
  const existing = getNestedValue<any[]>(obj, arrayPath, []);
  const arr = Array.isArray(existing) ? [...existing] : [];

  if (typeof index === "number" && index >= 0 && index <= arr.length) {
    arr.splice(index, 0, item);
  } else {
    arr.push(item);
  }

  return setNestedValue(obj, arrayPath, arr);
}

/**
 * Array manipulation helper: Removes an item from a nested array at a path.
 */
export function removeNestedArrayItem<T = any>(
  obj: T,
  arrayPath: string,
  index: number
): T {
  const existing = getNestedValue<any[]>(obj, arrayPath, []);
  if (!Array.isArray(existing) || index < 0 || index >= existing.length) {
    return obj;
  }

  const arr = [...existing];
  arr.splice(index, 1);
  return setNestedValue(obj, arrayPath, arr);
}

/**
 * Wraps a form submission callback to validate nested schemas and optionally flatten on submit.
 */
export function createNestedSubmitHandler<T>(
  onSubmit: (submittedData: any) => Promise<any> | any,
  options: {
    schema?: z.ZodType<T>;
    flatten?: boolean;
    flattenOptions?: FlattenOptions;
    onError?: (errors: Record<string, string>) => void;
  } = {}
) {
  return async (formData: any) => {
    if (options.schema) {
      const validation = validateNestedForm(formData, options.schema);
      if (!validation.success) {
        options.onError?.(validation.errors);
        return { success: false, errors: validation.errors };
      }
      formData = validation.data;
    }

    const payload = options.flatten
      ? flattenFormData(formData, options.flattenOptions)
      : formData;

    const result = await onSubmit(payload);
    return { success: true, result };
  };
}
