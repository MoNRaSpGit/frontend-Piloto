import { useEffect, useRef, useState, type FormEvent } from "react";
import { useEscapeToCancel } from "../hooks/useEscapeToCancel";

type AddClientModalProps = {
  onClose: () => void;
  onConfirm: (name: string, phone: string, address: string) => void;
};

export function AddClientModal({ onClose, onConfirm }: AddClientModalProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState("");
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEscapeToCancel(true, onClose);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => nameInputRef.current?.focus(), 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) {
      setError("Ingresa el nombre del cliente.");
      return;
    }
    onConfirm(name.trim(), phone.trim(), address.trim());
  }

  return (
    <div className="piloto-modal-overlay" role="dialog" aria-modal="true" aria-label="Nuevo cliente">
      <div className="piloto-modal-card">
        <div className="piloto-modal-card__header">
          <h2>Nuevo cliente</h2>
          <button type="button" className="piloto-modal-close" onClick={onClose}>
            Cerrar
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <label className="piloto-modal-field">
            <span>Nombre</span>
            <input ref={nameInputRef} value={name} onChange={(event) => setName(event.target.value)} placeholder="Ej: Pablo Porto" />
          </label>

          <label className="piloto-modal-field">
            <span>Telefono (opcional)</span>
            <input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Ej: 099123456" />
          </label>

          <label className="piloto-modal-field">
            <span>Direccion (opcional)</span>
            <input value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Ej: Calle y numero" />
          </label>

          {error ? <p className="piloto-scanner-status piloto-scanner-status--error">{error}</p> : null}

          <div className="piloto-modal-card__actions">
            <button type="button" className="piloto-button piloto-button--danger" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="piloto-button piloto-button--primary">
              Crear
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
