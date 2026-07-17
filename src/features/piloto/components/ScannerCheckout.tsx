import { useState } from "react";
import type { PilotoPaymentMethod } from "../piloto.types";

type ScannerCheckoutProps = {
  total: number;
  onCharge: (paymentMethod: PilotoPaymentMethod) => Promise<boolean>;
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency: "UYU",
    maximumFractionDigits: 0
  }).format(amount);
}

const PAYMENT_METHOD_OPTIONS: Array<{ value: PilotoPaymentMethod; label: string; className: string }> = [
  { value: "efectivo", label: "Efectivo", className: "piloto-payment-btn--cash" },
  { value: "tarjeta", label: "Tarjeta", className: "piloto-payment-btn--card" }
];

export function ScannerCheckout({ total, onCharge }: ScannerCheckoutProps) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PilotoPaymentMethod>("efectivo");

  async function handleConfirm() {
    if (isSubmitting) return;

    setIsSubmitting(true);
    const ok = await onCharge(paymentMethod);
    setIsSubmitting(false);

    if (ok) {
      setIsConfirmOpen(false);
      setPaymentMethod("efectivo");
    }
  }

  return (
    <>
      <div className="piloto-checkout">
        <div className="piloto-checkout__total-row">
          <span>Total</span>
          <strong>{formatCurrency(total)}</strong>
        </div>

        <button type="button" className="piloto-charge-btn" onClick={() => setIsConfirmOpen(true)}>
          Cobrar
        </button>
      </div>

      {isConfirmOpen ? (
        <div className="piloto-modal-overlay" role="dialog" aria-modal="true" aria-label="Confirmar cobro">
          <div className="piloto-modal-card">
            <div className="piloto-modal-card__header">
              <h2>Confirmar cobro</h2>
              <button type="button" className="piloto-modal-close" onClick={() => setIsConfirmOpen(false)} disabled={isSubmitting}>
                Cerrar
              </button>
            </div>

            <p className="piloto-modal-card__total-label">Total a cobrar</p>
            <p className="piloto-modal-card__total">{formatCurrency(total)}</p>

            <p className="piloto-modal-card__label">Medio de cobro</p>
            <div className="piloto-payment-grid">
              {PAYMENT_METHOD_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={`piloto-payment-btn ${option.className} ${paymentMethod === option.value ? "is-active" : ""}`}
                >
                  <input
                    type="radio"
                    name="piloto-payment-method"
                    className="piloto-payment-input"
                    value={option.value}
                    checked={paymentMethod === option.value}
                    disabled={isSubmitting}
                    onChange={() => setPaymentMethod(option.value)}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>

            <div className="piloto-modal-card__actions">
              <button
                type="button"
                className="piloto-button piloto-button--ghost"
                onClick={() => setIsConfirmOpen(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </button>
              <button type="button" className="piloto-button piloto-button--primary" onClick={handleConfirm} disabled={isSubmitting}>
                {isSubmitting ? "Confirmando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
