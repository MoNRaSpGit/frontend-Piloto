import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { getFondoState, takeFondoOrder, type PilotoFondoOrder } from "../piloto.api";
import type { CartItem } from "../piloto.types";

// Bandeja del "fondo" en el mostrador (30/10/2026, pedido explicito): cada
// "Enviar" de la tablet llega como un PEDIDO aparte, y se apilan en orden
// abajo a la izquierda ("pedido 1, pedido 2, pedido 3... no sumes todos los
// pedidos"). Se toca uno y se pasa a la caja cuando se quiera.
//
// "Tomar y seguir recibiendo" (03/11/2026) se SACO el 06/11/2026, pedido
// explicito: "que no se pueda robar el pedido... solo cuando le de enviar,
// ahi se queda con el pedido". Le generaba problemas al local. Ahora lo que
// la tablet esta pasando (sin enviar) NO se ve ni se puede tomar desde el
// mostrador: solo aparecen los pedidos ya enviados.
//
// VER sin tomar (14/11/2026, pedido explicito: "que no se pueda robar el
// pedido, pero que yo vaya viendo lo que ella va pasando... en gris, y cuando
// me lo manda queda en verde"): lo que la tablet esta pasando sin enviar
// aparece como una pastilla GRIS de solo lectura (se puede abrir para mirar,
// pero NO tiene boton de tomar). Al apretar Enviar pasa a ser un pedido
// verde, ya tomable.
//
// Un solo boton en el pedido (14/11/2026, pedido explicito): "Pasar a ..."; se
// saco "Dejar para despues" para que no se cancele sin querer al apretar
// mal. Para cerrar sin pasar queda la cruz arriba a la derecha.
//
// Un codigo que la tablet escanea sin encontrarlo en el catalogo llega
// como una linea mas, "Producto no encontrado" (ver PilotoTabletScreen.tsx)
// -- no hay nada especial que hacer aca, se edita como cualquier otra
// linea manual una vez que llego a la caja.
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
  const [orders, setOrders] = useState<PilotoFondoOrder[]>([]);
  // Lo que la tablet esta pasando ahora, sin enviar (solo para mirar).
  const [draftItems, setDraftItems] = useState<CartItem[]>([]);
  // id del pedido abierto, "draft" = lo que se esta pasando (solo lectura), null = cerrado.
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
        setOrders(next.orders);
        setDraftItems(next.draftItems ?? []);
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

  // Si se estaba mirando lo que la tablet pasa y ya lo envio (o lo vacio),
  // se cierra la vista: el pedido ya aparece aparte, en verde.
  useEffect(() => {
    if (openId === DRAFT && draftItems.length === 0) {
      setOpenId(null);
      onOpenChange(false);
    }
  }, [openId, draftItems, onOpenChange]);

  const openOrder = typeof openId === "number" ? orders.find((o) => o.id === openId) ?? null : null;
  const openItems = openId === DRAFT ? draftItems : openOrder?.items ?? [];
  const openTitle = openId === DRAFT ? "Fondo (sin enviar)" : openOrder ? `Pedido ${openOrder.number}` : "Pedido";

  // Pedido ya enviado: se toma de una sola vez (son inmutables desde que la
  // tablet aprieta Enviar).
  async function handleTakeOrder() {
    if (typeof openId !== "number") return;
    setIsTaking(true);
    try {
      const taken = await takeFondoOrder(openId);
      if (taken.items.length) {
        onTake(taken.items);
        toast.success(`${openTitle} pasado a ${targetLabel}`);
      } else {
        toast.info("Ese pedido ya no tenía productos.");
      }
      setOrders((prev) => prev.filter((o) => o.id !== openId));
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
            <button type="button" className="piloto-modal-close piloto-modal-close--x" aria-label="Cerrar" onClick={() => setOpen(null)}>
              ✕
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
          {openId === DRAFT ? (
            <>
              <p className="piloto-tablet__empty">La tablet todavía lo está pasando. Cuando toque Enviar, te llega como pedido.</p>
            </>
          ) : (
            <div className="piloto-modal-card__actions">
              <button type="button" className="piloto-button piloto-button--primary" disabled={!openItems.length || isTaking} onClick={() => void handleTakeOrder()}>
                {isTaking ? "Pasando…" : `Pasar a ${targetLabel}`}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!orders.length && !draftItems.length) return null;
  const draft = summary(draftItems);

  return (
    <div className="piloto-fondo-stack">
      {orders.map((order) => {
        const { count, total } = summary(order.items);
        return (
          <button key={order.id} type="button" className="piloto-fondo-pill is-sent" onClick={() => setOpen(order.id)}>
            🛒 Pedido {order.number} · {count} producto{count === 1 ? "" : "s"} · {formatCurrency(total)}
          </button>
        );
      })}
      {draftItems.length ? (
        <button type="button" className="piloto-fondo-pill is-draft" onClick={() => setOpen(DRAFT)}>
          ⏳ Pasando… · {draft.count} producto{draft.count === 1 ? "" : "s"} · {formatCurrency(draft.total)}
        </button>
      ) : null}
    </div>
  );
}
