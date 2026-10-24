import { useEffect, useState, type FormEvent } from "react";
import { toast } from "react-toastify";
import { TicketModal } from "../components/TicketModal";
import { useEscapeToCancel } from "../hooks/useEscapeToCancel";
import { createTicket, listTickets, updateProduct } from "../piloto.api";
import type { PilotoProduct } from "../piloto.types";
import { printBarcodeTicketsByQz } from "../services/piloto.qzPrint";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("es-UY", { style: "currency", currency: "UYU", maximumFractionDigits: 0 }).format(amount);
}

// "Tickets" -- Modo Pro (24/10/2026, pedido explicito): codigos de barras
// inventados para lo que se vende suelto (ej. 202020 Empanada $50). Se
// imprimen en la tiquetera y al pasarlos por el lector suman a la venta
// como cualquier producto. Si cambia el precio se edita aca: los tickets
// ya impresos siguen sirviendo, porque al escanear se usa el precio
// guardado, no el impreso. Reusa las clases visuales de Precios
// (piloto-prices-*) para que las dos pestanas Pro se vean iguales.
export function PilotoTicketsScreen() {
  const [tickets, setTickets] = useState<PilotoProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<PilotoProduct | null>(null);
  const [printingTicket, setPrintingTicket] = useState<PilotoProduct | null>(null);

  function loadTickets() {
    setIsLoading(true);
    setLoadError(null);
    return listTickets()
      .then(setTickets)
      .catch((error) => {
        const message = error instanceof Error ? error.message : "No se pudieron cargar los tickets.";
        setLoadError(message);
        toast.error(message);
      })
      .finally(() => setIsLoading(false));
  }

  useEffect(() => {
    void loadTickets();
  }, []);

  async function handleSave(barcode: string, name: string, price: number) {
    try {
      if (editingTicket) {
        const result = await updateProduct(editingTicket.id, name, price);
        setTickets((current) => current.map((ticket) => (ticket.id === result.item.id ? result.item : ticket)));
        toast.success("Ticket actualizado.");
      } else {
        const result = await createTicket(barcode, name, price);
        setTickets((current) => [...current, result.item].sort((a, b) => a.name.localeCompare(b.name, "es")));
        toast.success("Ticket creado.");
      }
      setIsModalOpen(false);
      setEditingTicket(null);
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar el ticket.");
      return false;
    }
  }

  return (
    <div className="piloto-prices">
      <div className="piloto-prices-toolbar">
        <h2 className="piloto-prices-heading">Tickets</h2>
        <button
          type="button"
          className="piloto-prices-add-btn"
          onClick={() => {
            setEditingTicket(null);
            setIsModalOpen(true);
          }}
        >
          <span aria-hidden="true">+</span> Nuevo ticket
        </button>
      </div>

      {isLoading ? (
        <p className="piloto-scanner-status">Cargando tickets...</p>
      ) : loadError ? (
        <section className="piloto-empty-state">
          <p>No se pudieron cargar los tickets: {loadError}</p>
          <button type="button" className="piloto-manual-btn" onClick={loadTickets}>
            Reintentar
          </button>
        </section>
      ) : tickets.length ? (
        <section className="piloto-prices-panel">
          <table className="piloto-prices-table piloto-tickets-table">
            <thead>
              <tr>
                <th>Codigo</th>
                <th>Producto</th>
                <th className="text-end">Precio</th>
                <th className="text-center">Imprimir</th>
                <th className="text-center">Editar</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((ticket) => (
                <tr key={ticket.id}>
                  <td className="piloto-tickets-code">{ticket.barcode}</td>
                  <td>
                    <div className="piloto-prices-row-name">{ticket.name}</div>
                  </td>
                  <td className="text-end piloto-prices-row-price">{formatCurrency(ticket.price)}</td>
                  <td className="text-center">
                    <button
                      type="button"
                      className="piloto-prices-action-btn piloto-prices-action-btn--add"
                      onClick={() => setPrintingTicket(ticket)}
                    >
                      Imprimir
                    </button>
                  </td>
                  <td className="text-center">
                    <button
                      type="button"
                      className="piloto-prices-action-btn"
                      onClick={() => {
                        setEditingTicket(ticket);
                        setIsModalOpen(true);
                      }}
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : (
        <section className="piloto-empty-state">
          <p>Todavia no hay tickets. Toca "Nuevo ticket" para crear el primero (ej. 202020 Empanada $50).</p>
        </section>
      )}

      {isModalOpen ? (
        <TicketModal
          ticket={editingTicket}
          onClose={() => {
            setIsModalOpen(false);
            setEditingTicket(null);
          }}
          onSave={handleSave}
        />
      ) : null}

      {printingTicket ? <PrintTicketsModal ticket={printingTicket} onClose={() => setPrintingTicket(null)} /> : null}
    </div>
  );
}

// Cuantas copias imprimir del ticket elegido (ej. 20 empanadas = 20
// tickets). Enter = imprimir, ESC = cancelar.
function PrintTicketsModal({ ticket, onClose }: { ticket: PilotoProduct; onClose: () => void }) {
  const [copiesInput, setCopiesInput] = useState("1");
  const [isPrinting, setIsPrinting] = useState(false);
  const [error, setError] = useState("");

  useEscapeToCancel(!isPrinting, onClose);

  async function handlePrint(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const copies = Number(copiesInput);
    if (!Number.isInteger(copies) || copies < 1 || copies > 50) {
      setError("Elegi entre 1 y 50 tickets.");
      return;
    }
    setError("");
    setIsPrinting(true);
    try {
      await printBarcodeTicketsByQz({ barcode: ticket.barcode, name: ticket.name, price: ticket.price }, copies);
      toast.success(copies === 1 ? "Ticket enviado a la impresora." : `${copies} tickets enviados a la impresora.`);
      onClose();
    } catch (printError) {
      setError(printError instanceof Error ? printError.message : "No se pudo imprimir.");
    } finally {
      setIsPrinting(false);
    }
  }

  return (
    <div className="piloto-modal-overlay" role="dialog" aria-modal="true" aria-label="Imprimir tickets">
      <div className="piloto-modal-card">
        <div className="piloto-modal-card__header">
          <h2>Imprimir {ticket.name}</h2>
          <button type="button" className="piloto-modal-close" onClick={onClose} disabled={isPrinting}>
            Cerrar
          </button>
        </div>
        <p className="piloto-modal-card__label">
          Codigo {ticket.barcode} · {formatCurrency(ticket.price)}
        </p>
        <form onSubmit={handlePrint}>
          <label className="piloto-modal-field">
            <span>Cantidad de tickets</span>
            <input
              value={copiesInput}
              onChange={(event) => setCopiesInput(event.target.value.replace(/\D/g, "").slice(0, 2))}
              inputMode="numeric"
              disabled={isPrinting}
              autoFocus
            />
          </label>
          {error ? <p className="piloto-scanner-status piloto-scanner-status--error">{error}</p> : null}
          <div className="piloto-modal-card__actions">
            <button type="button" className="piloto-button piloto-button--danger" onClick={onClose} disabled={isPrinting}>
              Cancelar
            </button>
            <button type="submit" className="piloto-button piloto-button--primary" disabled={isPrinting}>
              {isPrinting ? "Imprimiendo..." : "Imprimir"}
            </button>
          </div>
          <p className="piloto-enter-hint">Tecla Enter = Imprimir</p>
        </form>
      </div>
    </div>
  );
}
