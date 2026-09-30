/** "Maria da Silva" → "MS" */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? "") : "";
  return (first + last).toUpperCase();
}

/** "Maria da Silva" → "Maria" */
export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? "";
}
