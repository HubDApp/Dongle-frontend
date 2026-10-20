export const ratingOptions = [
  ["all", "All"], ["5", "5★"], ["4-5", "4–5★"],
  ["3", "3★"], ["1-2", "1–2★"], ["1", "1★"],
] as const;

export function validRating(value: string | null): string {
  return ratingOptions.some(([key]) => key === value) ? value! : "all";
}

export function matchesRating(rating: number, filter: string): boolean {
  if (validRating(filter) === "all") return true;
  const [min, max = min] = filter.split("-").map(Number);
  return Number.isFinite(rating) && rating >= min && rating <= max;
}
