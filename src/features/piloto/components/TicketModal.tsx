import { useRef, useState, type FormEvent } from "react";
import { useEscapeToCancel } from "../hooks/useEscapeToCancel";
import type { PilotoProduct } from "../piloto.types";
import { sanitizePriceInput } from "../services/piloto.priceInput";

type TicketModalProps = {
  // Con ticket: se edita (nombre y precio; el codigo queda fijo porque ya
  // puede estar impreso). Sin ticket: se crea uno nuevo.
  ticket: PilotoProduct | null;
  onClose: () => void;
  onSave: (barcode: string, name: string, price: number) => Promise<boolean>;
};

// Pestana "Tickets" (24/10/2026): mismo patron que PriceEntryModal (Enter
// pasa al siguiente campo y al final guarda, ESC cancela). El codigo es
// solo numeros: es lo que el lector lee sin problemas en cualquier
// configuracion de teclado.
export function TicketModal({ ticket, onClose, onSave }: TicketModalProps) {
  const isEditing = Boolean(ticket);
  const [barcode, setBarcode] = useState(ticket?.barcode ?? "");
  const [name, setName] = useState(ticket?.name ?? "");
  const [priceInput, setPriceInput] = useState(ticket ? String(ticket.price) : "");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const priceInputRef = useRef<HTMLInputElement>(null);

  useEscapeToCancel(!isSaving, onClose);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaving) return;

    if (!isEditing && barcode.length < 3) {
      setError("Ingresa un codigo de al menos 3 numeros.");
      barcodeInputRef.current?.focus();
      return;
    }
    if (!isEditing && document.activeElement === barcodeInputRef.current && !name.trim()) {
      nameInputRef.current?.focus();
      return;
    }

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Ingresa un nombre.");
      nameInputRef.current?.focus();
      return;
    }

    if (!priceInput.trim() && document.activeElement === nameInputRef.current) {
      priceInputRef.current?.focus();
      return;
    }

    const parsedPrice = Number(priceInput.replace(",", "."));
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      setError("Ingresa un precio valido mayor a 0.");
      priceInputRef.current?.focus();
      return;
    }

    setError("");
    setIsSaving(true);
    const ok = await onSave(barcode, trimmedName, parsedPrice);
    setIsSaving(false);
    if (!ok) setError("No se pudo guardar. Revisa que el codigo no exista ya.");
  }

  return (
    <div className="piloto-modal-overlay" role="dialog" aria-modal="true" aria-label={isEditing ? "Editar ticket" : "Nuevo ticket"}>
      <div className="piloto-modal-card">
        <div className="piloto-modal-card__header">
          <h2>{isEditing ? `Editar ticket ${ticket?.barcode}` : "Nuevo ticket"}</h2>
          <button type="button" className="piloto-modal-close" onClick={onClose} disabled={isSaving}>
            Cerrar
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {!isEditing && (
            <label className="piloto-modal-field">
              <span>Codigo (solo numeros)</span>
              <input
                ref={barcodeInputRef}
                value={barcode}
                onChange={(event) => setBarcode(event.target.value.replace(/\D/g, "").slice(0, 20))}
                inputMode="numeric"
                placeholder="Ej: 202020"
                disabled={isSaving}
                autoComplete="off"
                autoFocus
              />
            </label>
          )}

          <label className="piloto-modal-field">
            <span>Nombre</span>
            <input
              ref={nameInputRef}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ej: Empanada"
              disabled={isSaving}
              autoComplete="off"
              autoFocus={isEditing}
            />
          </label>

          <label className="piloto-modal-field">
            <span>Precio</span>
            <input
              ref={priceInputRef}
              value={priceInput}
              onChange={(event) => setPriceInput(sanitizePriceInput(event.target.value))}
              inputMode="decimal"
              placeholder="Ej: 50"
              disabled={isSaving}
            />
          </label>

          {error ? <p className="piloto-scanner-status piloto-scanner-status--error">{error}</p> : null}

          <div className="piloto-modal-card__actions">
            <button type="button" className="piloto-button piloto-button--danger" onClick={onClose} disabled={isSaving}>
              Cancelar
            </button>
            <button type="submit" className="piloto-button piloto-button--primary" disabled={isSaving}>
              {isSaving ? "Guardando..." : isEditing ? "Guardar" : "Crear ticket"}
            </button>
          </div>
          <p className="piloto-enter-hint">Tecla Enter = {isEditing ? "Guardar" : "siguiente / Crear"}</p>
        </form>
      </div>
    </div>
  );
}
