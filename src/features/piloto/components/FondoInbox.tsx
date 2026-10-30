import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { getFondoCart, takeFondoCart, type PilotoFondoCart } from "../piloto.api";
import type { CartItem } from "../piloto.types";

// Bandeja del "fondo" en el mostrador (30/10/2026, pedido explicito): si la
// tablet del fondo tiene productos, aparece un cartel flotante. Se puede
// abrir y "pasar a mi caja" cuando se quiera -- haya apretado "Enviar" o no
// (a la persona del fondo le puede costar tocar la tablet). Si la envio, el
// cartel titila y avisa una vez.

const POLL_MS = 2500;

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("es-UY", { style: "currency", currency: "UYU", maximumFractionDigits: 0 }).format(amount);
}

type FondoInboxProps = {
  targetLabel: string;
  onTake: (items: CartItem[]) => void;
  onOpenChange: (open: boolean) => void;
};

export function FondoInbox({ targetLabel, onTake, onOpenChange }: FondoInboxProps) {
  const [cart, setCart] = useState<PilotoFondoCart | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isTaking, setIsTaking] = useState(false);
  const lastSentRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const next = await getFondoCart();
        if (cancelled) return;
        if (next.sentAt && next.sentAt !== lastSentRef.current && next.items.length) {
          toast.info("El fondo te mandó una venta 🛒");
        }
        lastSentRef.current = next.sentAt;
        setCart(next);
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

  function setOpen(open: boolean) {
    setIsOpen(open);
    onOpenChange(open);
  }

  async function handleTake() {
    setIsTaking(true);
    try {
      const taken = await takeFondoCart();
      if (taken.items.length) {
        onTake(taken.items);
        toast.success(`Venta del fondo pasada a ${targetLabel}`);
      } else {
        toast.info("El fondo ya no tenía productos.");
      }
      setCart({ items: [], sentAt: null, updatedAt: null });
      setOpen(false);
    } catch {
      toast.error("No se pudo tomar la venta del fondo.");
    } finally {
      setIsTaking(false);
    }
  }

  const items = cart?.items ?? [];
  if (!items.length && !isOpen) return null;

  const count = items.reduce((sum, item) => sum + item.quantity, 0);
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const sent = !!cart?.sentAt;

  if (!isOpen) {
    return (
      <button type="button" className={sent ? "piloto-fondo-pill is-sent" : "piloto-fondo-pill"} onClick={() => setOpen(true)}>
        🛒 Fondo · {count} producto{count === 1 ? "" : "s"} · {formatCurrency(total)}
        {sent ? <b>Enviada</b> : null}
      </button>
    );
  }

  return (
    <div className="piloto-modal-overlay" role="dialog" aria-modal="true" aria-label="Venta del fondo">
      <div className="piloto-modal-card">
        <div className="piloto-modal-card__header">
          <h2>Venta del fondo</h2>
          <button type="button" className="piloto-modal-close" onClick={() => setOpen(false)}>
            Cerrar
          </button>
        </div>
        {items.length ? (
          <ul className="piloto-fondo-list">
            {items.map((item) => (
              <li key={item.productId}>
                <span>{item.quantity}×</span>
                <span>{item.name}</span>
                <strong>{formatCurrency(item.price * item.quantity)}</strong>
              </li>
            ))}
          </ul>
        ) : (
          <p className="piloto-tablet__empty">El fondo no tiene productos ahora.</p>
        )}
        <div className="piloto-fondo-total">
          <span>Total</span>
          <strong>{formatCurrency(total)}</strong>
        </div>
        <div className="piloto-modal-card__actions">
          <button type="button" className="piloto-button piloto-button--danger" onClick={() => setOpen(false)}>
            Dejar para después
          </button>
          <button type="button" className="piloto-button piloto-button--primary" disabled={!items.length || isTaking} onClick={() => void handleTake()}>
            {isTaking ? "Pasando…" : `Pasar a ${targetLabel}`}
          </button>
        </div>
      </div>
    </div>
  );
}
