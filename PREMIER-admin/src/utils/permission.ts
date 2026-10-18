export function parsePermissions(raw?: string): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return raw
      .split(/[,\n]/)
      .map((x) => x.trim())
      .filter(Boolean);
  }
}

export function hasPermission(raw: string | undefined, required?: string) {
  if (!required) return true;
  const owned = parsePermissions(raw);
  if (owned.includes('*') || owned.includes(required)) return true;
  const [module] = required.split(':');
  return owned.includes(`${module}:*`);
}
