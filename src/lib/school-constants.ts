import { z } from "zod";

export const GRADES = [
  "1º Ano", "2º Ano", "3º Ano", "4º Ano", "5º Ano",
  "6º Ano", "7º Ano", "8º Ano", "9º Ano",
];

export const CLASS_LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];

export const RELATIONSHIPS = [
  "Mãe", "Pai", "Avó", "Avô", "Tia", "Tio",
  "Irmã", "Irmão", "Madrasta", "Padrasto",
  "Tutor(a) Legal", "Responsável Legal", "Outro",
];

export function composeClassName(grade: string, letter: string): string {
  if (!grade || !letter) return "";
  return `${grade} ${letter}`;
}

export function decomposeClassName(className: string): { grade: string; letter: string } {
  if (!className) return { grade: "", letter: "" };
  const match = className.match(/^(\d+º\s*Ano)\s*([A-Z])$/i);
  if (match) {
    return { grade: match[1].replace(/\s+/g, " "), letter: match[2].toUpperCase() };
  }
  // Fallback: try ending with single letter
  const last = className.trim().slice(-1).toUpperCase();
  if (CLASS_LETTERS.includes(last)) {
    const rest = className.trim().slice(0, -1).trim();
    if (GRADES.includes(rest)) return { grade: rest, letter: last };
  }
  return { grade: "", letter: "" };
}

// Brazilian phone validation: accepts (XX) XXXX-XXXX or (XX) 9XXXX-XXXX
// Requires 10 or 11 digits total
export const phoneSchema = z
  .string()
  .trim()
  .refine(
    (v) => {
      if (!v) return true; // optional
      const digits = v.replace(/\D/g, "");
      return digits.length === 10 || digits.length === 11;
    },
    { message: "Telefone inválido. Use (XX) XXXXX-XXXX" }
  );

export function formatPhone(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}
