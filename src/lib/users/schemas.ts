import { z } from "zod";

const password = z.string().min(8, "Mínimo de 8 caracteres.").max(72, "Máximo de 72 caracteres.");

/** Nesta tela só existem perfis do painel; motoboys ficam na tela Motoboys. */
export const staffRoleSchema = z.enum(["admin", "operator"], "Escolha o perfil.");
export type StaffRole = z.infer<typeof staffRoleSchema>;

const name = z.string().trim().min(2, "Informe o nome.").max(120, "Máximo de 120 caracteres.");

export const staffCreateSchema = z.object({
  name,
  email: z.string().trim().toLowerCase().pipe(z.email("E-mail inválido.")),
  role: staffRoleSchema,
  password,
});

export const staffUpdateSchema = z.object({
  name,
  role: staffRoleSchema,
});

export const passwordResetSchema = z.object({ password });

export const ownPasswordSchema = z
  .object({
    current_password: z.string().min(1, "Informe a senha atual."),
    new_password: password,
    confirm_password: z.string(),
  })
  .refine((v) => v.new_password === v.confirm_password, {
    path: ["confirm_password"],
    message: "As senhas não conferem.",
  })
  .refine((v) => v.new_password !== v.current_password, {
    path: ["new_password"],
    message: "A nova senha deve ser diferente da atual.",
  });

export type StaffCreateInput = z.input<typeof staffCreateSchema>;
export type StaffCreateData = z.output<typeof staffCreateSchema>;
export type StaffUpdateInput = z.input<typeof staffUpdateSchema>;
export type StaffUpdateData = z.output<typeof staffUpdateSchema>;
export type PasswordResetInput = z.input<typeof passwordResetSchema>;
export type OwnPasswordInput = z.input<typeof ownPasswordSchema>;
