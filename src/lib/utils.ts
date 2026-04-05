import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format number as Brazilian Real: R$ 1.000,00 */
export function fmt(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/** Convert Date or ISO string to DD/MM/YYYY */
export function fmtDate(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("pt-BR");
}

/** Generate random 7-char alphanumeric ID */
export function genId(): string {
  return Math.random().toString(36).substring(2, 9);
}

/** Generate proposal number: ORG-YYYY-NNNN */
export function genProposalNumber(
  orgSlug: string,
  sequenceNumber: number
): string {
  const year = new Date().getFullYear();
  const slug = orgSlug.toUpperCase().substring(0, 5);
  const seq = String(sequenceNumber).padStart(4, "0");
  return `${slug}-${year}-${seq}`;
}

/** Format date to YYYY-MM-DD for input[type=date] */
export function toDateInput(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toISOString().split("T")[0];
}
