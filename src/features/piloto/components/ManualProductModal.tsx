import { useEffect, useRef, useState, type FormEvent } from "react";
import { useEscapeToCancel } from "../hooks/useEscapeToCancel";

type ManualProductModalProps = {
  // Los 4 botones de categoria de Modo Pro (23/09/2026, pedido explicito)
  // reusan este mismo modal, solo cambiando el titulo -- para que se vea a
  // simple vista que precio se esta por cargar antes de escribirlo. El
  // boton original "Producto Manual" no pasa `title`, asi que se comporta
  // identico a como era antes.
  title?: string;
  onClose: () => void;
  onConfirm: (price: number) => void;
};

export function ManualProductModal({ title = "Producto Manual", onClose, onConfirm }: ManualProductModalProps) {
  const [priceInput, setPriceInput] = useState("");
  const [error, setError] = useState("");
  const priceInputRef = useRef<HTMLInputElement>(null);

  // ESC = Cancelar (pedido explicito, 22/09/2026).
  useEscapeToCancel(true, onClose);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      priceInputRef.current?.focus();
      priceInputRef.current?.select();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedPrice = Number(priceInput.replace(",", "."));

    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      setError("Ingresa un precio valido mayor a 0.");
      return;
    }

    onConfirm(parsedPrice);
  }

  return (
    <div className="piloto-modal-overlay" role="dialog" aria-modal="true" aria-label={title}>
      <div className="piloto-modal-card">
        <div className="piloto-modal-card__header">
          <h2>{title}</h2>
          <button type="button" className="piloto-modal-close" onClick={onClose}>
            Cerrar
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <label className="piloto-modal-field">
            <span>Precio</span>
            <input
              ref={priceInputRef}
              value={priceInput}
              onChange={(event) => setPriceInput(event.target.value)}
              inputMode="decimal"
              placeholder="Ej: 150"
            />
          </label>

          {error ? <p className="piloto-scanner-status piloto-scanner-status--error">{error}</p> : null}

          <div className="piloto-modal-card__actions">
            <button type="button" className="piloto-button piloto-button--danger" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="piloto-button piloto-button--primary">
              Agregar
            </button>
          </div>
          <p className="piloto-enter-hint">Tecla Enter = Agregar</p>
        </form>
      </div>
    </div>
  );
}
