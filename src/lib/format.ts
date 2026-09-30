/** "Maria da Silva" → "MS" */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? "") : "";
  return (first + last).toUpperCase();
}

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** 29.9 → "R$ 29,90" */
export function formatBRL(value: number): string {
  return brl.format(value);
}

/** 29.9 → "29,90" (para preencher campos de formulário) */
export function toMoneyInput(value: number | null | undefined): string {
  if (value === null || value === undefined) return "";
  return value.toFixed(2).replace(".", ",");
}

/**
 * "29,90" | "29.90" | "1.234,50" | "R$ 5" → número com 2 casas; texto vazio → null.
 * Retorna NaN se não for um valor válido.
 */
export function parseMoney(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined) return null;
  if (typeof input === "number") return Math.round(input * 100) / 100;

  const cleaned = input.replace(/[R$\s]/g, "");
  if (cleaned === "") return null;

  // Com vírgula: formato brasileiro (ponto = milhar). Sem vírgula: ponto decimal.
  const normalized = cleaned.includes(",")
    ? cleaned.replace(/\./g, "").replace(",", ".")
    : cleaned;

  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return Number.NaN;
  return Math.round(Number(normalized) * 100) / 100;
}

/** "Maria da Silva" → "Maria" */
export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? "";
}
