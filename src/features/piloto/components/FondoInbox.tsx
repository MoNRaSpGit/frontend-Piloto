import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { getFondoState, resolveFondoUnknownBarcode, syncFondoDraft, takeFondoOrder, type PilotoFondoState } from "../piloto.api";
import type { CartItem } from "../piloto.types";
import { ScannerQuickAddModal } from "./ScannerQuickAddModal";

// Bandeja del "fondo" en el mostrador (30/10/2026, pedido explicito): cada
// "Enviar" de la tablet llega como un PEDIDO aparte, y se apilan en orden
// abajo a la izquierda ("pedido 1, pedido 2, pedido 3... no sumes todos los
// pedidos"). Se toca uno y se pasa a la caja cuando se quiera.
//
// "Tomar y seguir recibiendo" (03/11/2026, pedido explicito: "si yo quiero
// me lo robo... y si ella sigue pasando, me sigue sumando en el mio"): el
// borrador (lo que la tablet esta pasando, sin enviar) ya no se toma de
// una sola vez -- se reclama, y de ahi en mas cada producto nuevo que
// escanee la tablet se va sumando solo, sin tener que volver a tocar
// nada, hasta que la tablet aprieta "Enviar" (eso cierra ese pedido).
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
  // Producto escaneado en la tablet que no existe en el catalogo: se crea
  // y se agrega a la caja activa, igual que el alta rapida del mostrador.
  onResolveUnknownProduct: (barcode: string, name: string, price: number) => Promise<boolean>;
};

const EMPTY_STATE: PilotoFondoState = { orders: [], draftItems: [], draftClaimed: false, pendingUnknownBarcode: null };

export function FondoInbox({ targetLabel, onTake, onOpenChange, onResolveUnknownProduct }: FondoInboxProps) {
  const [state, setState] = useState<PilotoFondoState>(EMPTY_STATE);
  // id del pedido abierto, "draft" = lo que la tablet esta pasando, null = cerrado.
  const [openId, setOpenId] = useState<number | typeof DRAFT | null>(null);
  const [isTaking, setIsTaking] = useState(false);
  const seenOrdersRef = useRef<Set<number> | null>(null);

  // El aviso de "producto no registrado" tambien es un modal -- el
  // mostrador tiene que poder escribir ahi sin que el reenfoque
  // automatico del escaner se lo pise.
  useEffect(() => {
    onOpenChange(openId !== null || state.pendingUnknownBarcode !== null);
  }, [openId, state.pendingUnknownBarcode, onOpenChange]);

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

        // Ya reclamado: cada vuelta, traer SOLO lo nuevo desde la ultima
        // vez y sumarlo a la caja activa sin pedir nada mas.
        if (next.draftClaimed) {
          const synced = await syncFondoDraft(false);
          if (cancelled) return;
          if (synced.items.length) onTake(synced.items);
        }
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
  }, [onTake]);

  // Codigo escaneado en la tablet que no existe en el catalogo: se carga
  // igual que el alta rapida del mostrador, y despues se avisa al
  // servidor que ya se resolvio (compara y limpia, no pisa un aviso
  // distinto que haya llegado mientras tanto).
  async function handleResolveUnknown(name: string, price: number) {
    const barcode = state.pendingUnknownBarcode;
    if (!barcode) return false;
    const ok = await onResolveUnknownProduct(barcode, name, price);
    if (ok) {
      await resolveFondoUnknownBarcode(barcode);
      setState((prev) => (prev.pendingUnknownBarcode === barcode ? { ...prev, pendingUnknownBarcode: null } : prev));
    }
    return ok;
  }

  function handleDismissUnknown() {
    const barcode = state.pendingUnknownBarcode;
    if (!barcode) return;
    void resolveFondoUnknownBarcode(barcode);
    setState((prev) => (prev.pendingUnknownBarcode === barcode ? { ...prev, pendingUnknownBarcode: null } : prev));
  }

  function setOpen(next: number | typeof DRAFT | null) {
    setOpenId(next);
  }

  const openOrder = typeof openId === "number" ? state.orders.find((o) => o.id === openId) ?? null : null;
  const openItems = openId === DRAFT ? state.draftItems : openOrder?.items ?? [];
  const openTitle = openId === DRAFT ? "Fondo (sin enviar)" : openOrder ? `Pedido ${openOrder.number}` : "Pedido";

  // Pedido ya enviado: se toma de una sola vez, como siempre (son
  // inmutables desde que la tablet aprieta Enviar).
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
      setState((prev) => ({ ...prev, orders: prev.orders.filter((o) => o.id !== openId) }));
      setOpen(null);
    } catch {
      toast.error("No se pudo tomar el pedido del fondo.");
    } finally {
      setIsTaking(false);
    }
  }

  // Borrador sin enviar: "reclamarlo" no lo vacia -- entrega lo que haya
  // hasta ahora y deja la puerta abierta para que lo que la tablet siga
  // escaneando se siga sumando solo (ver el poll de mas arriba).
  async function handleClaimDraft() {
    setIsTaking(true);
    try {
      const claimed = await syncFondoDraft(true);
      if (claimed.items.length) {
        onTake(claimed.items);
        toast.success(`Fondo pasado a ${targetLabel} · va a seguir sumando lo que escanee`);
      }
      setState((prev) => ({ ...prev, draftClaimed: true }));
      setOpen(null);
    } catch {
      toast.error("No se pudo tomar el fondo.");
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
            {openId === DRAFT ? (
              <button type="button" className="piloto-button piloto-button--primary" disabled={!openItems.length || isTaking} onClick={() => void handleClaimDraft()}>
                {isTaking ? "Tomando…" : `Tomar y seguir recibiendo en ${targetLabel}`}
              </button>
            ) : (
              <button type="button" className="piloto-button piloto-button--primary" disabled={!openItems.length || isTaking} onClick={() => void handleTakeOrder()}>
                {isTaking ? "Pasando…" : `Pasar a ${targetLabel}`}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (state.pendingUnknownBarcode) {
    return (
      <ScannerQuickAddModal
        barcode={state.pendingUnknownBarcode}
        onClose={handleDismissUnknown}
        onConfirm={handleResolveUnknown}
      />
    );
  }

  if (!state.orders.length && !state.draftItems.length && !state.draftClaimed) return null;

  return (
    <div className="piloto-fondo-stack">
      {state.draftClaimed ? <span className="piloto-fondo-pill piloto-fondo-pill--live">🔴 Recibiendo del fondo en vivo</span> : null}
      {state.orders.map((order) => {
        const { count, total } = summary(order.items);
        return (
          <button key={order.id} type="button" className="piloto-fondo-pill is-sent" onClick={() => setOpen(order.id)}>
            🛒 Pedido {order.number} · {count} producto{count === 1 ? "" : "s"} · {formatCurrency(total)}
          </button>
        );
      })}
      {state.draftItems.length && !state.draftClaimed ? (
        <button type="button" className="piloto-fondo-pill" onClick={() => setOpen(DRAFT)}>
          🛒 Fondo (sin enviar) · {formatCurrency(summary(state.draftItems).total)}
        </button>
      ) : null}
    </div>
  );
}
