import { useEffect, useState } from "react";
import { getAccountHistory } from "../piloto.api";
import { formatAccountAmount, formatAccountDate } from "../piloto.account";
import type { PilotoAccountHistory } from "../piloto.types";

type Movement = {
  key: string;
  type: "fiado" | "pago";
  createdAt: string;
  amount: number;
  detail: string;
  voided: boolean;
  balance: number;
  closesAccount: boolean;
};

// Los movimientos de un cliente, del mas viejo al mas nuevo, con el saldo
// que iba quedando.
function buildMovements(history: PilotoAccountHistory, clientId: number): Movement[] {
  const closingPaymentIds = new Set(
    [...history.entries, ...history.payments].map((row) => row.closedByPaymentId).filter((id): id is number => id !== null)
  );
  const rows = [
    ...history.entries
      .filter((entry) => entry.clientId === clientId)
      .map((entry) => ({
        key: `f${entry.id}`,
        type: "fiado" as const,
        order: 0,
        createdAt: entry.createdAt,
        amount: entry.total,
        detail: entry.items.map((item) => (item.quantity > 1 ? `${item.quantity}x ${item.productName}` : item.productName)).join(", "),
        voided: entry.voided,
        closesAccount: false
      })),
    ...history.payments
      .filter((payment) => payment.clientId === clientId)
      .map((payment) => ({
        key: `p${payment.id}`,
        type: "pago" as const,
        order: 1,
        createdAt: payment.createdAt,
        amount: payment.amount,
        detail: "",
        voided: payment.voided,
        closesAccount: !payment.voided && closingPaymentIds.has(payment.id)
      }))
  ].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.order - b.order);

  let cents = 0;
  return rows.map(({ order: _order, ...row }) => {
    if (!row.voided) cents += Math.round(row.amount * 100) * (row.type === "fiado" ? 1 : -1);
    return { ...row, balance: cents / 100 };
  });
}

// "Historial de créditos" (27/11/2026, solo Modo Pro): todo lo fiado y
// cobrado de cada cliente, incluidas las cuentas ya saldadas. Solo lectura.
export function PilotoCreditHistoryScreen() {
  const [history, setHistory] = useState<PilotoAccountHistory | null>(null);
  const [error, setError] = useState("");
  const [clientId, setClientId] = useState<number | null>(null);

  useEffect(() => {
    getAccountHistory()
      .then(setHistory)
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "No se pudo cargar el historial."));
  }, []);

  if (error) {
    return (
      <section className="piloto-empty-state">
        <p>No se pudo cargar el historial: {error}</p>
      </section>
    );
  }
  if (!history) {
    return <p className="piloto-scanner-status">Cargando historial...</p>;
  }

  const clients = history.clients.filter((client) =>
    [...history.entries, ...history.payments].some((row) => row.clientId === client.id)
  );
  const selectedId = clientId ?? clients[0]?.id ?? null;
  const movements = selectedId === null ? [] : buildMovements(history, selectedId).reverse();

  if (!clients.length) {
    return (
      <section className="piloto-empty-state">
        <p>Todavia no hay creditos registrados.</p>
      </section>
    );
  }

  return (
    <div className="piloto-history">
      <h2 className="piloto-dashboard-section-title">Historial de créditos</h2>

      <div className="piloto-history__clients" role="group" aria-label="Cliente">
        {clients.map((client) => (
          <button
            key={client.id}
            type="button"
            className={client.id === selectedId ? "piloto-history__client is-active" : "piloto-history__client"}
            onClick={() => setClientId(client.id)}
          >
            {client.name}
            {client.deletedAt ? " (borrado)" : ""}
          </button>
        ))}
      </div>

      <ul className="piloto-history__list">
        {movements.map((movement) => (
          <li
            key={movement.key}
            className={`piloto-history__row piloto-history__row--${movement.type}${movement.voided ? " is-voided" : ""}`}
          >
            <div className="piloto-history__line">
              <span>
                {movement.type === "fiado" ? "Fiado" : "Pagó"}
                {movement.voided ? " · anulado" : ""}
              </span>
              <strong>{formatAccountAmount(movement.amount)}</strong>
            </div>
            <div className="piloto-history__meta">
              <span>{formatAccountDate(movement.createdAt)}</span>
              <span>Saldo {formatAccountAmount(movement.balance)}</span>
            </div>
            {movement.detail ? <p className="piloto-history__detail">{movement.detail}</p> : null}
            {movement.closesAccount ? <p className="piloto-history__closed">✓ Cuenta saldada</p> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
