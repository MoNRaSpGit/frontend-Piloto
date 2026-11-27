import { useState, type FormEvent } from "react";
import { useEscapeToCancel } from "../hooks/useEscapeToCancel";
import { formatAccountAmount, parseAmountInput } from "../piloto.account";

type AccountPaymentModalProps = {
  clientName: string;
  balance: number;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: (amount: number) => void;
};

// "Saldar cuenta" (27/11/2026): un solo camino para pagar todo o una parte --
// siempre se escribe cuanto paga (arranca vacio, nunca se cobra sin escribirlo).
// Antes de confirmar se ve bien claro cuanto queda debiendo.
export function AccountPaymentModal({ clientName, balance, isSubmitting, onClose, onConfirm }: AccountPaymentModalProps) {
  const [input, setInput] = useState("");
  useEscapeToCancel(!isSubmitting, onClose);

  const amount = parseAmountInput(input);
  const isTooMuch = amount !== null && amount > balance;
  const isValid = amount !== null && !isTooMuch;
  const remaining = isValid ? Math.round((balance - amount) * 100) / 100 : balance;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isValid && !isSubmitting) onConfirm(amount);
  }

  return (
    <div className="piloto-modal-overlay" role="dialog" aria-modal="true" aria-label="Saldar cuenta">
      <form className="piloto-modal-card piloto-fiar-modal" onSubmit={handleSubmit}>
        <div className="piloto-fiar-modal__header">
          <h2>Saldar cuenta</h2>
          <p className="piloto-pay-modal__client">{clientName}</p>
          <p className="piloto-pay-modal__owes">Debe {formatAccountAmount(balance)}</p>
        </div>

        <label className="piloto-fiar-modal__label" htmlFor="piloto-pay-amount">
          ¿Cuánto paga?
        </label>
        <input
          id="piloto-pay-amount"
          className="piloto-fiar-modal__search piloto-pay-modal__input"
          inputMode="decimal"
          autoComplete="off"
          placeholder="Escribí el monto"
          autoFocus
          value={input}
          onChange={(event) => setInput(event.target.value)}
          disabled={isSubmitting}
        />

        {input && amount === null ? (
          <p className="piloto-fiar-modal__empty">Escribí solo el monto, por ejemplo 5000.</p>
        ) : isTooMuch ? (
          <p className="piloto-fiar-modal__empty">No puede pagar más de lo que debe.</p>
        ) : isValid ? (
          <div className="piloto-pay-modal__summary">
            <p>
              Paga <strong>{formatAccountAmount(amount)}</strong>
            </p>
            <p>{remaining === 0 ? "La cuenta queda en cero" : `Queda debiendo ${formatAccountAmount(remaining)}`}</p>
          </div>
        ) : null}

        <div className="piloto-fiar-modal__actions">
          <button type="button" className="piloto-button piloto-button--danger" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </button>
          <button type="submit" className="piloto-button piloto-fiar-modal__confirm" disabled={isSubmitting || !isValid}>
            {isSubmitting ? "Guardando..." : isValid ? `Cobrar ${formatAccountAmount(amount)}` : "Escribí el monto"}
          </button>
        </div>
      </form>
    </div>
  );
}
