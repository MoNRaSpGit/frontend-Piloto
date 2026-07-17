import { useEffect, useRef, useState, type FormEvent } from "react";

type ScannerQuickAddModalProps = {
  barcode: string;
  onClose: () => void;
  onConfirm: (name: string, price: number) => Promise<boolean>;
};

export function ScannerQuickAddModal({ barcode, onClose, onConfirm }: ScannerQuickAddModalProps) {
  const [name, setName] = useState("");
  const [priceInput, setPriceInput] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const priceInputRef = useRef<HTMLInputElement>(null);

  // El cursor va directo al precio: es el unico dato obligatorio para dar de alta rapido.
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      priceInputRef.current?.focus();
      priceInputRef.current?.select();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    const parsedPrice = Number(priceInput.replace(",", "."));
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      setError("Ingresa un precio valido mayor a 0.");
      return;
    }

    setError("");
    setIsSubmitting(true);
    const ok = await onConfirm(name.trim() || "S/N", parsedPrice);
    setIsSubmitting(false);

    if (!ok) {
      setError("No se pudo guardar el producto. Intenta de nuevo.");
    }
  }

  return (
    <div className="piloto-modal-overlay" role="dialog" aria-modal="true" aria-label="Producto no encontrado">
      <div className="piloto-modal-card">
        <div className="piloto-modal-card__header">
          <h2>Producto no encontrado</h2>
          <button type="button" className="piloto-modal-close" onClick={onClose} disabled={isSubmitting}>
            Cerrar
          </button>
        </div>

        <p className="piloto-modal-card__label">Codigo escaneado: {barcode}</p>

        <form onSubmit={handleSubmit}>
          <label className="piloto-modal-field">
            <span>Nombre (opcional)</span>
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="S/N" disabled={isSubmitting} />
          </label>

          <label className="piloto-modal-field">
            <span>Precio</span>
            <input
              ref={priceInputRef}
              value={priceInput}
              onChange={(event) => setPriceInput(event.target.value)}
              inputMode="decimal"
              placeholder="Ej: 150"
              disabled={isSubmitting}
            />
          </label>

          {error ? <p className="piloto-scanner-status piloto-scanner-status--error">{error}</p> : null}

          <div className="piloto-modal-card__actions">
            <button type="button" className="piloto-button piloto-button--ghost" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </button>
            <button type="submit" className="piloto-button piloto-button--primary" disabled={isSubmitting}>
              {isSubmitting ? "Guardando..." : "Agregar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
