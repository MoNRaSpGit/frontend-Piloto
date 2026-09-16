import { useEffect, useRef, useState } from "react";

type ScannerCheckoutProps = {
  total: number;
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  onCharge: () => Promise<boolean>;
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency: "UYU",
    maximumFractionDigits: 0
  }).format(amount);
}

// Pedido explicito (16/09/2026): "saca lo de tarjeta efectivo y demas,
// que apriete cobrar salga el modal mas grande para confirmar con el
// precio y listo". Ya no se elige medio de pago -- un solo boton,
// confirmar y cobrar.
export function ScannerCheckout({ total, isOpen, onOpen, onClose, onCharge }: ScannerCheckoutProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  // Autofocus del boton Confirmar al abrir: permite el camino feliz por teclado
  // (Enter en el escaner abre el modal, un segundo Enter confirma el cobro).
  useEffect(() => {
    if (!isOpen) return;
    const timeoutId = window.setTimeout(() => confirmButtonRef.current?.focus(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [isOpen]);

  async function handleConfirm() {
    if (isSubmitting) return;

    setIsSubmitting(true);
    const ok = await onCharge();
    setIsSubmitting(false);

    if (ok) {
      onClose();
    }
  }

  return (
    <>
      <div className="piloto-checkout">
        <div className="piloto-checkout__total-row">
          <span>Total</span>
          <strong>{formatCurrency(total)}</strong>
        </div>

        <button type="button" className="piloto-charge-btn" onClick={onOpen}>
          Cobrar
        </button>
      </div>

      {isOpen ? (
        <div className="piloto-modal-overlay" role="dialog" aria-modal="true" aria-label="Confirmar cobro">
          <div className="piloto-modal-card piloto-modal-card--checkout">
            <p className="piloto-modal-card__total-label">Total a cobrar</p>
            <p className="piloto-modal-card__total piloto-modal-card__total--big">{formatCurrency(total)}</p>

            <div className="piloto-modal-card__actions piloto-modal-card__actions--big">
              <button type="button" className="piloto-button piloto-button--ghost" onClick={onClose} disabled={isSubmitting}>
                Cancelar
              </button>
              <button
                ref={confirmButtonRef}
                type="button"
                className="piloto-button piloto-button--primary piloto-button--big"
                onClick={handleConfirm}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Confirmando..." : "Confirmar cobro"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
