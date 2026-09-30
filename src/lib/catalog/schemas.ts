import { z } from "zod";

import { parseMoney } from "@/lib/format";

// Usados no formulário (cliente) e revalidados nas Server Actions (servidor).

// Aceita null na entrada para que dados já validados no cliente possam ser
// revalidados no servidor com o mesmo schema.
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Máximo de ${max} caracteres.`)
    .nullable()
    .transform((v) => (v ? v : null));

const requiredMoney = (label: string) =>
  z
    .union([z.string(), z.number()])
    .transform((v) => parseMoney(v))
    .refine((v) => v !== null, `Informe ${label}.`)
    .refine((v) => v === null || !Number.isNaN(v), `${label[0].toUpperCase()}${label.slice(1)} inválido.`)
    .refine((v) => v === null || v >= 0, "O valor não pode ser negativo.")
    .refine((v) => v === null || v <= 99999.99, "Valor muito alto.")
    .transform((v) => v as number);

const optionalMoney = z
  .union([z.string(), z.number(), z.null()])
  .transform((v) => parseMoney(v))
  .refine((v) => v === null || !Number.isNaN(v), "Valor inválido.")
  .refine((v) => v === null || v >= 0, "O valor não pode ser negativo.");

const imageUrl = z.url("Imagem inválida.").nullable();

// ---------------------------------------------------------------------
// Categoria
// ---------------------------------------------------------------------
export const categorySchema = z.object({
  name: z.string().trim().min(1, "Informe o nome.").max(80, "Máximo de 80 caracteres."),
  description: optionalText(500),
  image_url: imageUrl,
  active: z.boolean(),
});

export type CategoryInput = z.input<typeof categorySchema>;
export type CategoryData = z.output<typeof categorySchema>;

// ---------------------------------------------------------------------
// Produto
// ---------------------------------------------------------------------
export const productSchema = z
  .object({
    name: z.string().trim().min(1, "Informe o nome.").max(120, "Máximo de 120 caracteres."),
    category_id: z.uuid("Selecione a categoria."),
    description: optionalText(1000),
    image_url: imageUrl,
    price: requiredMoney("o preço").refine((v) => v > 0, "O preço deve ser maior que zero."),
    promotional_price: optionalMoney,
    available: z.boolean(),
    featured: z.boolean(),
    best_seller: z.boolean(),
  })
  .refine((p) => p.promotional_price === null || p.promotional_price < p.price, {
    path: ["promotional_price"],
    message: "O preço promocional deve ser menor que o preço normal.",
  });

export type ProductInput = z.input<typeof productSchema>;
export type ProductData = z.output<typeof productSchema>;

// ---------------------------------------------------------------------
// Grupos de opções (adicionais)
// ---------------------------------------------------------------------
export const productOptionSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(1, "Informe o nome da opção.").max(80, "Máximo de 80 caracteres."),
  additional_price: requiredMoney("o valor"),
  available: z.boolean(),
});

export const optionGroupSchema = z
  .object({
    id: z.uuid().optional(),
    name: z.string().trim().min(1, "Informe o nome do grupo.").max(80, "Máximo de 80 caracteres."),
    required: z.boolean(),
    min_choices: z.coerce.number<string | number>().int("Número inteiro.").min(0),
    max_choices: z.coerce
      .number<string | number>()
      .int("Número inteiro.")
      .min(1, "Mínimo 1.")
      .max(50, "Máximo 50."),
    options: z.array(productOptionSchema).min(1, "Adicione pelo menos uma opção.").max(50),
  })
  .transform((g) => ({
    ...g,
    // Opcional ⇒ mínimo 0. Obrigatório ⇒ mínimo ao menos 1.
    min_choices: g.required ? Math.max(1, g.min_choices) : 0,
  }))
  .superRefine((g, ctx) => {
    if (g.min_choices > g.max_choices) {
      ctx.addIssue({
        code: "custom",
        path: ["min_choices"],
        message: "O mínimo não pode ser maior que o máximo.",
      });
    }
    if (g.max_choices > g.options.length) {
      ctx.addIssue({
        code: "custom",
        path: ["max_choices"],
        message: `O máximo não pode passar do número de opções (${g.options.length}).`,
      });
    }
  });

export const optionGroupsSchema = z.object({
  groups: z.array(optionGroupSchema).max(20, "Máximo de 20 grupos."),
});

export type OptionGroupsInput = z.input<typeof optionGroupsSchema>;
export type OptionGroupsData = z.output<typeof optionGroupsSchema>;
