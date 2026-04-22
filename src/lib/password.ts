import { z } from "zod";

export const PASSWORD_MIN_LENGTH = 8;

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Senha deve ter ao menos ${PASSWORD_MIN_LENGTH} caracteres`)
  .max(128, "Senha muito longa")
  .refine((v) => /[a-zA-Z]/.test(v), "Senha deve conter ao menos uma letra")
  .refine((v) => /[0-9]/.test(v), "Senha deve conter ao menos um numero");

export function validatePassword(value: string): string | null {
  const parsed = passwordSchema.safeParse(value);
  if (parsed.success) return null;
  return parsed.error.issues[0]?.message || "Senha invalida";
}
