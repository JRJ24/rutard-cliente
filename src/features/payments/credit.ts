import type { CustomerProfile } from '@/types/api';

/** Credito corporativo utilizable: solo BUSINESS con cuenta ACTIVE y saldo. */
export function corporateCredit(customer: CustomerProfile | undefined | null) {
  const account = customer?.creditAccount;
  const available = account ? Math.max(0, Number(account.creditLimit) - Number(account.balanceUsed)) : 0;
  const usable = customer?.customerType === 'BUSINESS' && account?.status === 'ACTIVE' && available > 0;
  return { account, available, usable, days: account?.creditDays ?? 0 };
}

/** Nota que app-customers agrega a la orden cuando se paga con cheque. */
export const CHECK_NOTE = 'Metodo de pago solicitado: cheque a registrar por operaciones.';
