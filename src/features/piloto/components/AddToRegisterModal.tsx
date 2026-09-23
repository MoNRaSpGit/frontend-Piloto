import { useEffect, useRef, useState } from "react";
import { useEscapeToCancel } from "../hooks/useEscapeToCancel";
import type { PilotoRegisterId } from "../hooks/usePilotoCart";

type RegisterOption = {
  id: PilotoRegisterId;
  count: number;
};

type AddToRegisterModalProps = {
  itemLabel: string;
  registers: RegisterOption[];
  defaultRegisterId: PilotoRegisterId;
  onConfirm: (registerId: PilotoRegisterId) => void;
  onClose: () => void;
};

// "Precios" -- Modo Pro (23/09/2026, pedido explicito): "¿A que caja
// agregar?" antes de mandar un precio a la venta -- Caja 1 preseleccionada,
// se puede cambiar a Caja 2 y despues Confirmar.
export function AddToRegisterModal({ itemLabel, registers, defaultRegisterId, onConfirm, onClose }: AddToRegisterModalProps) {
  const [selectedRegisterId, setSelectedRegisterId] = useState<PilotoRegisterId>(defaultRegisterId);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  useEscapeToCancel(true, onClose);

  // Enter = OK en toda la app (pedido explicito, 24/09/2026). Este modal
  // no tiene <form> (son botones, no campos de texto), asi que el foco
  // inicial en "Confirmar" es lo que hace que Enter confirme apenas se
  // abre -- mismo patron que el foco automatico de ScannerCheckout.
  useEffect(() => {
    const timeoutId = window.setTimeout(() => confirmButtonRef.current?.focus(), 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  return (
    <div className="piloto-modal-overlay" role="dialog" aria-modal="true" aria-label="Elegir caja">
      <div className="piloto-modal-card">
        <div className="piloto-modal-card__header">
          <h2>¿A qué caja agregar?</h2>
          <button type="button" className="piloto-modal-close" onClick={onClose}>
            Cerrar
          </button>
        </div>

        <p className="piloto-modal-card__label">{itemLabel}</p>

        <div className="piloto-mode-options">
          {registers.map((register) => (
            <button
              key={register.id}
              type="button"
              className={register.id === selectedRegisterId ? "piloto-mode-option is-active" : "piloto-mode-option"}
              onClick={() => setSelectedRegisterId(register.id)}
            >
              <strong>Caja {register.id}</strong>
              {register.count > 0 ? <span>{register.count} producto(s) cargados</span> : <span>Vacía</span>}
            </button>
          ))}
        </div>

        <div className="piloto-modal-card__actions">
          <button type="button" className="piloto-button piloto-button--danger" onClick={onClose}>
            Cancelar
          </button>
          <button
            ref={confirmButtonRef}
            type="button"
            className="piloto-button piloto-button--primary"
            onClick={() => onConfirm(selectedRegisterId)}
          >
            Confirmar
          </button>
        </div>
        <p className="piloto-enter-hint">Tecla Enter = Confirmar</p>
      </div>
    </div>
  );
}
