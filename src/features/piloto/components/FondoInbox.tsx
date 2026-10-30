import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { getFondoState, takeFondoOrder, type PilotoFondoState } from "../piloto.api";
import type { CartItem } from "../piloto.types";

// Bandeja del "fondo" en el mostrador (30/10/2026, pedido explicito): cada
// "Enviar" de la tablet llega como un PEDIDO aparte, y se apilan en orden
// abajo a la izquierda ("pedido 1, pedido 2, pedido 3... no sumes todos los
// pedidos"). Se toca uno y se pasa a la caja cuando se quiera. Si la tablet
// esta pasando algo sin enviar, aparece al final como "Fondo (sin enviar)" y
// tambien se puede tomar (a la persona del fondo le puede costar tocar
// "Enviar").

const POLL_MS = 2500;
const DRAFT = "draft" as const;

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("es-UY", { style: "currency", currency: "UYU", maximumFractionDigits: 0 }).format(amount);
}

function summary(items: CartItem[]) {
  const count = items.reduce((sum, item) => sum + item.quantity, 0);
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  return { count, total };
}

type FondoInboxProps = {
  targetLabel: string;
  onTake: (items: CartItem[]) => void;
  onOpenChange: (open: boolean) => void;
};

export function FondoInbox({ targetLabel, onTake, onOpenChange }: FondoInboxProps) {
  const [state, setState] = useState<PilotoFondoState>({ orders: [], draftItems: [] });
  // id del pedido abierto, "draft" = lo que la tablet esta pasando, null = cerrado.
  const [openId, setOpenId] = useState<number | typeof DRAFT | null>(null);
  const [isTaking, setIsTaking] = useState(false);
  const seenOrdersRef = useRef<Set<number> | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const next = await getFondoState();
        if (cancelled) return;
        // Aviso una vez por pedido nuevo (no en la primera carga).
        const seen = seenOrdersRef.current;
        if (seen) {
          for (const order of next.orders) {
            if (!seen.has(order.id)) toast.info(`Llegó el Pedido ${order.number} del fondo 🛒`);
          }
        }
        seenOrdersRef.current = new Set(next.orders.map((o) => o.id));
        setState(next);
      } catch {
        // Sin conexion un momento: se reintenta en la proxima vuelta.
      }
    }
    void poll();
    const id = window.setInterval(() => void poll(), POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  function setOpen(next: number | typeof DRAFT | null) {
    setOpenId(next);
    onOpenChange(next !== null);
  }

  const openOrder = typeof openId === "number" ? state.orders.find((o) => o.id === openId) ?? null : null;
  const openItems = openId === DRAFT ? state.draftItems : openOrder?.items ?? [];
  const openTitle = openId === DRAFT ? "Fondo (sin enviar)" : openOrder ? `Pedido ${openOrder.number}` : "Pedido";

  async function handleTake() {
    if (openId === null) return;
    setIsTaking(true);
    try {
      const taken = await takeFondoOrder(openId === DRAFT ? undefined : openId);
      if (taken.items.length) {
        onTake(taken.items);
        toast.success(`${openTitle} pasado a ${targetLabel}`);
      } else {
        toast.info("Ese pedido ya no tenía productos.");
      }
      setState((prev) =>
        openId === DRAFT ? { ...prev, draftItems: [] } : { ...prev, orders: prev.orders.filter((o) => o.id !== openId) }
      );
      setOpen(null);
    } catch {
      toast.error("No se pudo tomar el pedido del fondo.");
    } finally {
      setIsTaking(false);
    }
  }

  if (openId !== null) {
    const { total } = summary(openItems);
    return (
      <div className="piloto-modal-overlay" role="dialog" aria-modal="true" aria-label={openTitle}>
        <div className="piloto-modal-card">
          <div className="piloto-modal-card__header">
            <h2>{openTitle}</h2>
            <button type="button" className="piloto-modal-close" onClick={() => setOpen(null)}>
              Cerrar
            </button>
          </div>
          {openItems.length ? (
            <ul className="piloto-fondo-list">
              {openItems.map((item) => (
                <li key={item.productId}>
                  <span>{item.quantity}×</span>
                  <span>{item.name}</span>
                  <strong>{formatCurrency(item.price * item.quantity)}</strong>
                </li>
              ))}
            </ul>
          ) : (
            <p className="piloto-tablet__empty">Este pedido ya no tiene productos.</p>
          )}
          <div className="piloto-fondo-total">
            <span>Total</span>
            <strong>{formatCurrency(total)}</strong>
          </div>
          <div className="piloto-modal-card__actions">
            <button type="button" className="piloto-button piloto-button--danger" onClick={() => setOpen(null)}>
              Dejar para después
            </button>
            <button type="button" className="piloto-button piloto-button--primary" disabled={!openItems.length || isTaking} onClick={() => void handleTake()}>
              {isTaking ? "Pasando…" : `Pasar a ${targetLabel}`}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!state.orders.length && !state.draftItems.length) return null;

  return (
    <div className="piloto-fondo-stack">
      {state.orders.map((order) => {
        const { count, total } = summary(order.items);
        return (
          <button key={order.id} type="button" className="piloto-fondo-pill is-sent" onClick={() => setOpen(order.id)}>
            🛒 Pedido {order.number} · {count} producto{count === 1 ? "" : "s"} · {formatCurrency(total)}
          </button>
        );
      })}
      {state.draftItems.length ? (
        <button type="button" className="piloto-fondo-pill" onClick={() => setOpen(DRAFT)}>
          🛒 Fondo (sin enviar) · {formatCurrency(summary(state.draftItems).total)}
        </button>
      ) : null}
    </div>
  );
}
