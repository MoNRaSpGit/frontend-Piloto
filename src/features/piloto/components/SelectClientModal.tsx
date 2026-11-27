import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
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

// Sin tildes ni mayusculas: "jose" encuentra "José".
function normalizeSearch(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

// "Fiar" (06/10/2026): elegir a que cliente se le carga la venta a cuenta.
// Rehecho el 27/11/2026 para personas mayores (pedido explicito): todo
// grande y a la vista, la lista de clientes como botones (sin desplegable),
// el elegido marcado bien fuerte y el boton final dice a quien se le carga.
// Con teclado: flechas para moverse, Enter para confirmar, Esc para salir.
export function SelectClientModal({ clients, total, isSubmitting, onClose, onConfirm }: SelectClientModalProps) {
  const [clientId, setClientId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);

  useEscapeToCancel(!isSubmitting, onClose);

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: "nearest" });
  }, [clientId]);

  const term = normalizeSearch(search);
  const visibleClients = term ? clients.filter((client) => normalizeSearch(client.name).includes(term)) : clients;
  // Solo vale un elegido que se este VIENDO: nunca confirmar a ciegas.
  const selected = visibleClients.find((client) => client.id === clientId) ?? null;

  function handleConfirm() {
    if (!selected || isSubmitting) return;
    onConfirm(selected.id);
  }

  function handleKeyDown(event: ReactKeyboardEvent) {
    if (isSubmitting) return;

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (!visibleClients.length) return;
      event.preventDefault();
      const current = visibleClients.findIndex((client) => client.id === selected?.id);
      const step = event.key === "ArrowDown" ? 1 : -1;
      const next = current === -1 ? 0 : (current + step + visibleClients.length) % visibleClients.length;
      setClientId(visibleClients[next].id);
      searchRef.current?.focus();
      return;
    }

    // Sobre un boton, Enter hace lo propio de ese boton.
    if (event.key !== "Enter" || event.repeat || (event.target as HTMLElement).tagName === "BUTTON") return;
    event.preventDefault();
    if (selected) handleConfirm();
    else if (visibleClients.length === 1) setClientId(visibleClients[0].id);
  }

  return (
    <div className="piloto-modal-overlay" role="dialog" aria-modal="true" aria-label="Venta a credito" onKeyDown={handleKeyDown}>
      <div className="piloto-modal-card piloto-fiar-modal">
        <div className="piloto-fiar-modal__header">
          <h2>Venta a crédito</h2>
          <p className="piloto-fiar-modal__total">{formatCurrency(total)}</p>
        </div>

        {clients.length === 0 ? (
          <p className="piloto-fiar-modal__empty">Todavía no hay clientes. Andá a "Clientes" y agregá uno primero.</p>
        ) : (
          <>
            <label className="piloto-fiar-modal__label" htmlFor="piloto-fiar-search">
              ¿A quién se le anota?
            </label>
            <input
              id="piloto-fiar-search"
              ref={searchRef}
              type="text"
              className="piloto-fiar-modal__search"
              placeholder="Escribí el nombre..."
              autoComplete="off"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              disabled={isSubmitting}
            />

            {visibleClients.length === 0 ? (
              <p className="piloto-fiar-modal__empty">No hay ningún cliente con ese nombre.</p>
            ) : (
              <ul className="piloto-fiar-modal__list">
                {visibleClients.map((client) => {
                  const isSelected = client.id === selected?.id;
                  return (
                    <li key={client.id}>
                      <button
                        type="button"
                        ref={isSelected ? selectedRef : undefined}
                        className={isSelected ? "piloto-fiar-modal__client is-selected" : "piloto-fiar-modal__client"}
                        aria-pressed={isSelected}
                        onClick={() => setClientId(client.id)}
                        disabled={isSubmitting}
                      >
                        <span className="piloto-fiar-modal__check" aria-hidden="true">
                          {isSelected ? "✓" : ""}
                        </span>
                        <span className="piloto-fiar-modal__name">{client.name}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}

        <div className="piloto-fiar-modal__actions">
          <button type="button" className="piloto-button piloto-button--danger" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </button>
          <button type="button" className="piloto-button piloto-fiar-modal__confirm" onClick={handleConfirm} disabled={isSubmitting || !selected}>
            {isSubmitting ? "Guardando..." : selected ? `Anotar a ${selected.name}` : "Elegí un cliente"}
          </button>
        </div>
      </div>
    </div>
  );
}
