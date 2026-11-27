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
  const selected = clients.find((client) => String(client.id) === clientId) ?? null;

  useEscapeToCancel(!isSubmitting, onClose);

  function handleConfirm() {
    if (!clientId) return;
    onConfirm(Number(clientId));
  }

  return (
    <div className="piloto-modal-overlay" role="dialog" aria-modal="true" aria-label="Venta a credito">
      {/* Mismo formato de siempre, mas grande para personas mayores (27/11/2026). */}
      <div className="piloto-modal-card piloto-credit-modal">
        <div className="piloto-modal-card__header">
          <h2>Venta a crédito</h2>
          <button type="button" className="piloto-modal-close" onClick={onClose} disabled={isSubmitting}>
            Cerrar
          </button>
        </div>

        <div className="piloto-credit-modal__total-box">
          <p className="piloto-modal-card__total-label">Total a crédito</p>
          <p className="piloto-modal-card__total">{formatCurrency(total)}</p>
        </div>

        {clients.length === 0 ? (
          <p className="piloto-scanner-status piloto-scanner-status--error">
            Todavía no hay clientes. Andá a "Clientes" y agregá uno primero.
          </p>
        ) : (
          <label className={selected ? "piloto-modal-field is-selected" : "piloto-modal-field"}>
            <span>¿A quién se le anota?</span>
            <select value={clientId} onChange={(event) => setClientId(event.target.value)} disabled={isSubmitting} autoFocus>
              <option value="">Tocá acá para elegir...</option>
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
            className="piloto-button piloto-credit-modal__confirm"
            onClick={handleConfirm}
            disabled={isSubmitting || !clientId}
          >
            {isSubmitting ? "Guardando..." : selected ? `Anotar a ${selected.name}` : "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}
