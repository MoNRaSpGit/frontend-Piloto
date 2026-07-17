import { useEffect, useRef, useState, type FormEvent } from "react";

type ManualProductModalProps = {
  onClose: () => void;
  onConfirm: (price: number) => void;
};

export function ManualProductModal({ onClose, onConfirm }: ManualProductModalProps) {
  const [priceInput, setPriceInput] = useState("");
  const [error, setError] = useState("");
  const priceInputRef = useRef<HTMLInputElement>(null);

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
    <div className="piloto-modal-overlay" role="dialog" aria-modal="true" aria-label="Producto manual">
      <div className="piloto-modal-card">
        <div className="piloto-modal-card__header">
          <h2>Producto Manual</h2>
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
            <button type="button" className="piloto-button piloto-button--ghost" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="piloto-button piloto-button--primary">
              Agregar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
