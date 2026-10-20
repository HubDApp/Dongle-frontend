/** Bounded string preferences shared by help and command history. */
export function readPreference(key: string): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? [...new Set(value.filter((item): item is string => typeof item === "string"))].slice(0, 20) : [];
  } catch { return []; }
}

export function rememberPreference(key: string, value: string): string[] {
  const values = [value, ...readPreference(key).filter(item => item !== value)].slice(0, 20);
  try { localStorage.setItem(key, JSON.stringify(values)); } catch { /* Optional persistence. */ }
  return values;
}
