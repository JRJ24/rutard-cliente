import type { CustomerType, DocumentType } from '@/types/api';
import { cleanPhone } from './format';

/** Mismas reglas que valida la API (DTO) y que usa app-customers. */
export const PHONE_RE = /^\+?[0-9]{10,15}$/;
export const EMAIL_RE = /^\S+@\S+\.\S+$/;

export function emailError(value: string): string | null {
  return EMAIL_RE.test(value.trim()) ? null : 'Correo inválido.';
}

export function phoneError(value: string): string | null {
  return PHONE_RE.test(cleanPhone(value)) ? null : 'Usa 10 a 15 dígitos, ej. 8095551234.';
}

/** La API exige 8–72 caracteres con al menos una letra y un numero. */
export function passwordError(value: string): string | null {
  if (value.length < 8) return 'Mínimo 8 caracteres.';
  if (value.length > 72) return 'Máximo 72 caracteres.';
  if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) return 'Usa letras y números.';
  return null;
}

export interface FiscalValues {
  customerType: CustomerType;
  documentType: DocumentType;
  documentNumber: string;
  companyName: string;
  billingEmail: string;
}

export type FieldErrors<K extends string> = Partial<Record<K, string>>;

export function validateFiscal(values: FiscalValues): FieldErrors<keyof FiscalValues> {
  const errors: FieldErrors<keyof FiscalValues> = {};
  const doc = values.documentNumber.trim();
  if (doc.length < 3 || doc.length > 40) errors.documentNumber = 'Documento inválido.';
  if (values.customerType === 'BUSINESS' && values.companyName.trim().length < 3) {
    errors.companyName = 'Escribe la razón social.';
  }
  if (values.billingEmail.trim() && emailError(values.billingEmail)) {
    errors.billingEmail = 'Correo de facturación inválido.';
  }
  return errors;
}

/** Solo los campos fiscales que la API acepta (forbidNonWhitelisted). */
export function fiscalPayload(values: FiscalValues) {
  return {
    customerType: values.customerType,
    documentType: values.documentType,
    documentNumber: values.documentNumber.trim(),
    ...(values.customerType === 'BUSINESS' && values.companyName.trim()
      ? { companyName: values.companyName.trim() }
      : {}),
    ...(values.billingEmail.trim() ? { billingEmail: values.billingEmail.trim().toLowerCase() } : {}),
  };
}

/** Numero de un campo de texto ("1,5" o "1.5"); NaN si esta vacio. */
export function numberFromInput(value: string): number {
  const trimmed = value.trim().replace(',', '.');
  return trimmed ? Number(trimmed) : Number.NaN;
}
