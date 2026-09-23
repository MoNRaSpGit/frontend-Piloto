import { useRef, useState, type FormEvent } from "react";
import { useEscapeToCancel } from "../hooks/useEscapeToCancel";
import type { PilotoPriceEntry } from "../piloto.types";

type PriceEntryModalProps = {
  // Si viene un precio existente, el modal edita ese registro (solo
  // nombre/precio, la categoria queda fija); si no, crea uno nuevo en
  // `categoryLabel` (la subpestana donde se toco "+ Agregar").
  entry?: PilotoPriceEntry | null;
  categoryLabel: string;
  onClose: () => void;
  onSave: (name: string, price: number) => Promise<boolean>;
};

// "Precios" -- Modo Pro (23/09/2026): mismo patron que ManualProductModal/
// ScannerQuickAddModal (nombre + precio, Enter guarda, ESC cancela).
export function PriceEntryModal({ entry, categoryLabel, onClose, onSave }: PriceEntryModalProps) {
  const isEditing = Boolean(entry);
  const [name, setName] = useState(entry?.name ?? "");
  const [priceInput, setPriceInput] = useState(entry ? String(entry.price) : "");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEscapeToCancel(!isSaving, onClose);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaving) return;

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Ingresa un nombre.");
      nameInputRef.current?.focus();
      return;
    }

    const parsedPrice = Number(priceInput.replace(",", "."));
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      setError("Ingresa un precio valido mayor a 0.");
      return;
    }

    setError("");
    setIsSaving(true);
    const ok = await onSave(trimmedName, parsedPrice);
    setIsSaving(false);

    if (!ok) {
      setError("No se pudo guardar. Intenta de nuevo.");
    }
  }

  return (
    <div className="piloto-modal-overlay" role="dialog" aria-modal="true" aria-label={isEditing ? "Editar precio" : "Agregar precio"}>
      <div className="piloto-modal-card">
        <div className="piloto-modal-card__header">
          <h2>{isEditing ? "Editar precio" : "Agregar precio"}</h2>
          <button type="button" className="piloto-modal-close" onClick={onClose} disabled={isSaving}>
            Cerrar
          </button>
        </div>

        <p className="piloto-modal-card__label">Categoria: {categoryLabel}</p>

        <form onSubmit={handleSubmit}>
          <label className="piloto-modal-field">
            <span>Nombre</span>
            <input
              ref={nameInputRef}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ej: Papas McCain"
              disabled={isSaving}
              autoComplete="off"
              autoFocus
            />
          </label>

          <label className="piloto-modal-field">
            <span>Precio</span>
            <input
              value={priceInput}
              onChange={(event) => setPriceInput(event.target.value)}
              inputMode="decimal"
              placeholder="Ej: 250"
              disabled={isSaving}
            />
          </label>

          {error ? <p className="piloto-scanner-status piloto-scanner-status--error">{error}</p> : null}

          <div className="piloto-modal-card__actions">
            <button type="button" className="piloto-button piloto-button--danger" onClick={onClose} disabled={isSaving}>
              Cancelar
            </button>
            <button type="submit" className="piloto-button piloto-button--primary" disabled={isSaving}>
              {isSaving ? "Guardando..." : isEditing ? "Guardar" : "Agregar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
