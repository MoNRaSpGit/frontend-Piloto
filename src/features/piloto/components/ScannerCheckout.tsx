import { useEffect, useRef, useState } from "react";
import { useEscapeToCancel } from "../hooks/useEscapeToCancel";

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

  // ESC = Cancelar (pedido explicito, 22/09/2026) -- no cancela mientras
  // se esta confirmando el cobro, igual que el boton Cancelar (ver
  // disabled mas abajo).
  useEscapeToCancel(isOpen && !isSubmitting, onClose);

  // Guarda contra doble cobro: state no alcanza (dos Enter en el mismo
  // instante leen el mismo valor viejo), asi que se usa un ref.
  const isChargingRef = useRef(false);

  async function handleConfirm() {
    if (isChargingRef.current) return;
    isChargingRef.current = true;

    setIsSubmitting(true);
    const ok = await onCharge();
    setIsSubmitting(false);
    isChargingRef.current = false;

    if (ok) {
      onClose();
    }
  }

  // Pedido explicito (20/09/2026): "Enter siempre sigue el camino logico".
  // Con el modal abierto, Enter confirma el cobro AUNQUE el foco se haya
  // perdido (ej: tocaron el total con el mouse y el boton ya no tiene el
  // cursor). Si el foco esta en un boton (Confirmar o Cancelar) se deja
  // que Enter haga lo suyo de siempre sobre ese boton -- asi Enter sobre
  // Cancelar cancela, y sobre Confirmar no se dispara dos veces.
  //
  // El listener llama SIEMPRE a la ultima version de handleConfirm (via
  // ref): si quedara guardada la del momento en que se abrio el modal,
  // cobraria un carrito viejo si cambio algo mientras estaba abierto.
  const latestConfirmRef = useRef(handleConfirm);
  useEffect(() => {
    latestConfirmRef.current = handleConfirm;
  });

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Enter" || event.repeat) return;
      if ((event.target as HTMLElement | null)?.tagName === "BUTTON") return;
      event.preventDefault();
      void latestConfirmRef.current();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

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
              {/* Cancelar en rojo y grande (pedido explicito 20/09/2026, para
                  que se vea bien a simple vista); Confirmar sigue siendo la
                  accion principal (negro, arriba, con el foco). */}
              <button type="button" className="piloto-button piloto-button--danger piloto-button--big" onClick={onClose} disabled={isSubmitting}>
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
            <p className="piloto-enter-hint">Tecla Enter = Confirmar cobro</p>
          </div>
        </div>
      ) : null}
    </>
  );
}
