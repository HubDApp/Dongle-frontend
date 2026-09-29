/** Common, immutable array operations. */

export function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

export function compact<T>(values: Array<T | null | undefined | false | ''>): T[] {
  return values.filter(Boolean) as T[];
}

export function chunk<T>(values: T[], size: number): T[][] {
  if (!Number.isInteger(size) || size < 1) {
    throw new Error("Chunk size must be a positive integer");
  }

  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

export function groupBy<T, K extends PropertyKey>(
  values: T[],
  getKey: (value: T) => K,
): Record<K, T[]> {
  return values.reduce<Record<K, T[]>>((groups, value) => {
    const key = getKey(value);
    (groups[key] ??= []).push(value);
    return groups;
  }, {} as Record<K, T[]>);
}