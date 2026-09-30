/** "X-Bacon Especial!" → "x-bacon-especial" */
export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

/**
 * Gera um slug que não esteja na lista de slugs existentes:
 * "x-bacon" → "x-bacon-2" → "x-bacon-3"...
 */
export function uniqueSlug(base: string, taken: Iterable<string>): string {
  const root = slugify(base) || "item";
  const used = new Set(taken);
  if (!used.has(root)) return root;
  for (let n = 2; ; n++) {
    const candidate = `${root}-${n}`;
    if (!used.has(candidate)) return candidate;
  }
}
