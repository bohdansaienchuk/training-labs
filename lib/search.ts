export function normalizeSearch(value: string): string {
  return value.trim().toLocaleLowerCase("uk");
}

export function matchesSearch(name: string, query: string): boolean {
  return normalizeSearch(name).includes(normalizeSearch(query));
}
