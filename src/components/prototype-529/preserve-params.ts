// PROTOTYPE #529 (throwaway): URL params that survive the login redirect.
export const PROTOTYPE_PARAMS = ["date", "list", "feedback"] as const;

export type PrototypeParam = (typeof PROTOTYPE_PARAMS)[number];
export type PatternVariant = "a" | "b" | "c";

export function readPrototypeParams(get: (key: string) => string | null | undefined): Record<string, string> {
  const picked: Record<string, string> = {};
  for (const key of PROTOTYPE_PARAMS) {
    const value = get(key);
    if (value === "a" || value === "b" || value === "c") picked[key] = value;
  }
  return picked;
}
