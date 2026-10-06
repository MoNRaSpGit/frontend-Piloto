import { useState } from "react";
import { useEscapeToCancel } from "../hooks/useEscapeToCancel";
import type { PilotoClient } from "../piloto.types";

type SelectClientModalProps = {
  clients: PilotoClient[];
  total: number;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: (clientId: number) => void;
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency: "UYU",
    maximumFractionDigits: 0
  }).format(amount);
}

// "Fiar" (06/10/2026, pedido explicito): elegir a que cliente se le carga
// la venta a cuenta en vez de cobrarla. Mismo espiritu que el selector de
// cliente de Joker, pero aca es su propio modal (en Piloto no hay
// selector de metodo de pago en el checkout).
export function SelectClientModal({ clients, total, isSubmitting, onClose, onConfirm }: SelectClientModalProps) {
  const [clientId, setClientId] = useState<string>("");

  useEscapeToCancel(!isSubmitting, onClose);

  function handleConfirm() {
    if (!clientId) return;
    onConfirm(Number(clientId));
  }

  return (
    <div className="piloto-modal-overlay" role="dialog" aria-modal="true" aria-label="Fiar venta">
      <div className="piloto-modal-card">
        <div className="piloto-modal-card__header">
          <h2>Fiar venta</h2>
          <button type="button" className="piloto-modal-close" onClick={onClose} disabled={isSubmitting}>
            Cerrar
          </button>
        </div>

        <p className="piloto-modal-card__total-label">Total a fiar</p>
        <p className="piloto-modal-card__total">{formatCurrency(total)}</p>

        {clients.length === 0 ? (
          <p className="piloto-scanner-status piloto-scanner-status--error">
            No hay clientes creados todavia. Anda a "Clientes" y agrega uno primero.
          </p>
        ) : (
          <label className="piloto-modal-field">
            <span>Cliente</span>
            <select value={clientId} onChange={(event) => setClientId(event.target.value)} disabled={isSubmitting}>
              <option value="">Elegir cliente...</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="piloto-modal-card__actions">
          <button type="button" className="piloto-button piloto-button--danger" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </button>
          <button
            type="button"
            className="piloto-button piloto-button--primary"
            onClick={handleConfirm}
            disabled={isSubmitting || !clientId}
          >
            {isSubmitting ? "Fiando..." : "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}
