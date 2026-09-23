import { useState } from "react";
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

  useEscapeToCancel(true, onClose);

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
          <button type="button" className="piloto-button piloto-button--primary" onClick={() => onConfirm(selectedRegisterId)}>
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
