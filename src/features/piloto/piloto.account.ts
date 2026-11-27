// Cuenta corriente: formato, saldo e identificadores (27/11/2026).
import type { PilotoAccountEntry, PilotoAccountPayment } from "./piloto.types";

// Montos de cuentas: sin decimales salvo que existan (nunca esconder
// centesimos de un saldo).
export function formatAccountAmount(amount: number) {
  const digits = Number.isInteger(amount) ? 0 : 2;
  return new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency: "UYU",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  }).format(amount);
}

export function formatAccountDate(isoDate: string) {
  return new Date(isoDate).toLocaleString("es-UY", {
    timeZone: "America/Montevideo",
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

// Saldo en centesimos para no arrastrar errores de redondeo.
export function accountBalance(entries: PilotoAccountEntry[], payments: PilotoAccountPayment[]) {
  const charged = entries.filter((entry) => !entry.voided).reduce((sum, entry) => sum + Math.round(entry.total * 100), 0);
  const paid = payments.filter((payment) => !payment.voided).reduce((sum, payment) => sum + Math.round(payment.amount * 100), 0);
  return (charged - paid) / 100;
}

// Lee lo que se escribe a mano: "5000", "5.000", "$ 5.000", "150,50".
// null = no se entiende (no se registra nada).
export function parseAmountInput(raw: string): number | null {
  let text = raw.replace(/[$\s]/g, "");
  if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(text)) text = text.replace(/\./g, "");
  if (!/^\d+([.,]\d{1,2})?$/.test(text)) return null;
  const value = Number(text.replace(",", "."));
  return value > 0 ? value : null;
}

// El mismo identificador mientras se reintenta la MISMA operacion: si el
// servidor ya la habia guardado (mala senal), no la registra dos veces.
export function createRequestKeeper() {
  let current: { key: string; id: string } | null = null;
  return {
    idFor(key: string) {
      if (current?.key !== key) {
        current = { key, id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}` };
      }
      return current.id;
    },
    done() {
      current = null;
    }
  };
}
