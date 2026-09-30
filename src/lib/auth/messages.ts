/** Mensagens exibidas a partir do parâmetro ?erro= da URL. */
const MESSAGES: Record<string, string> = {
  inativo: "Seu acesso está desativado. Fale com o administrador.",
  "sem-permissao": "Você não tem permissão para acessar aquela página.",
  "link-invalido": "O link de acesso é inválido ou expirou.",
};

export function messageFromQuery(value: string | string[] | undefined): string | undefined {
  const key = Array.isArray(value) ? value[0] : value;
  return key ? MESSAGES[key] : undefined;
}

export function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
