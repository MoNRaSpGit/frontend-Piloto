import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { findProductByBarcode, getFondoCart, setFondoCart } from "../piloto.api";
import type { CartItem } from "../piloto.types";
import { ManualProductModal } from "../components/ManualProductModal";
import { ScannerInput } from "../components/ScannerInput";

// Pestaña "Tablet" (30/10/2026, pedido explicito): la tablet del FONDO del
// local, con su propio lector. Lo que se escanea aca NO entra a ninguna
// caja: se guarda en el servidor como "la venta del fondo", y el mostrador
// la ve y la toma a su caja cuando quiere (ver FondoInbox.tsx). Asi no se
// mezclan los productos de dos clientes que se atienden al mismo tiempo.
// Pensada para una persona mayor: letra grande, un solo boton importante, y
// "Enviar" es opcional (el mostrador puede tomarla igual sin que se envie).

const POLL_MS = 3000;
// Despues de guardar, se ignora un ratito lo que diga el servidor para no
// pisar con datos viejos un escaneo recien hecho.
const WRITE_GRACE_MS = 1500;

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("es-UY", { style: "currency", currency: "UYU", maximumFractionDigits: 0 }).format(amount);
}

export function PilotoTabletScreen() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [sent, setSent] = useState(false);
  const [barcode, setBarcode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [focusSignal, setFocusSignal] = useState(0);
  const [notice, setNotice] = useState("");
  const [isManualOpen, setIsManualOpen] = useState(false);
  const lastWriteRef = useRef(0);
  const itemsRef = useRef<CartItem[]>([]);
  itemsRef.current = items;

  async function save(next: CartItem[], markSent = false) {
    setItems(next);
    itemsRef.current = next;
    lastWriteRef.current = Date.now();
    try {
      const saved = await setFondoCart(next, markSent);
      setSent(saved.sentAt !== null);
    } catch {
      toast.error("No se pudo guardar en el servidor. Revisá la conexión.");
    }
  }

  // Al abrir, retoma lo que haya quedado del fondo; despues, cada pocos
  // segundos se fija si el mostrador ya la tomo (el servidor queda vacio).
  useEffect(() => {
    let cancelled = false;
    async function poll(initial: boolean) {
      if (!initial && Date.now() - lastWriteRef.current < WRITE_GRACE_MS) return;
      try {
        const cart = await getFondoCart();
        if (cancelled) return;
        if (initial) {
          setItems(cart.items);
          setSent(cart.sentAt !== null);
        } else if (cart.items.length === 0 && itemsRef.current.length > 0) {
          setItems([]);
          setSent(false);
          setNotice("✓ El mostrador ya tomó la venta. Podés empezar otra.");
          setFocusSignal((s) => s + 1);
        }
      } catch {
        // Sin conexion un momento: se reintenta en la proxima vuelta.
      }
    }
    void poll(true);
    const id = window.setInterval(() => void poll(false), POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  async function handleScan(code: string) {
    setIsLoading(true);
    setError("");
    setNotice("");
    try {
      const { item: product } = await findProductByBarcode(code);
      const current = itemsRef.current;
      const existing = current.find((item) => item.productId === product.id);
      const next = existing
        ? [{ ...existing, quantity: existing.quantity + 1 }, ...current.filter((item) => item.productId !== product.id)]
        : [{ productId: product.id, name: product.name, price: product.price, quantity: 1, imageUrl: product.imageUrl }, ...current];
      await save(next);
    } catch (scanError) {
      const notFound = scanError instanceof Error && scanError.message === "Producto no encontrado.";
      setError(notFound ? "Ese producto no está cargado. Pasalo en el mostrador." : "No se pudo leer el producto.");
    } finally {
      setBarcode("");
      setIsLoading(false);
      setFocusSignal((s) => s + 1);
    }
  }

  // Producto manual (30/10/2026, pedido explicito): igual que en el
  // mostrador, una linea nueva con el precio que se escriba. El id negativo
  // sale del reloj para que nunca choque con los manuales que se carguen
  // en el mostrador (esos cuentan -1, -2, ...).
  async function handleManualConfirm(price: number) {
    setIsManualOpen(false);
    setNotice("");
    const manual: CartItem = { productId: -(Date.now() % 1_000_000_000), name: "Producto Manual", price, quantity: 1, imageUrl: null };
    await save([manual, ...itemsRef.current]);
    setFocusSignal((s) => s + 1);
  }

  async function removeOne(productId: number) {
    const next = itemsRef.current
      .map((item) => (item.productId === productId ? { ...item, quantity: item.quantity - 1 } : item))
      .filter((item) => item.quantity > 0);
    await save(next);
    setFocusSignal((s) => s + 1);
  }

  async function handleSend() {
    if (!itemsRef.current.length) return;
    await save(itemsRef.current, true);
    setNotice("✓ Enviado. El mostrador lo va a cobrar.");
    setFocusSignal((s) => s + 1);
  }

  async function handleClear() {
    if (!window.confirm("¿Borrar todos los productos del fondo?")) return;
    await save([]);
    setNotice("");
    setFocusSignal((s) => s + 1);
  }

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const count = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <section className="piloto-tablet">
      <div className="piloto-tablet__title">
        <strong>Fondo</strong>
        <span>Pasá los productos con el lector. El mostrador los ve al instante.</span>
      </div>

      <ScannerInput
        value={barcode}
        onChange={setBarcode}
        onSubmit={(code) => void handleScan(code)}
        onEmptyEnter={() => undefined}
        isLoading={isLoading}
        error={error}
        focusSignal={focusSignal}
      />

      <button type="button" className="piloto-tablet__manual" onClick={() => setIsManualOpen(true)}>
        + Producto manual
      </button>

      {isManualOpen ? (
        <ManualProductModal
          onClose={() => {
            setIsManualOpen(false);
            setFocusSignal((s) => s + 1);
          }}
          onConfirm={(price) => void handleManualConfirm(price)}
        />
      ) : null}

      {notice ? <p className="piloto-tablet__notice">{notice}</p> : null}

      {items.length ? (
        <ul className="piloto-tablet__list">
          {items.map((item) => (
            <li key={item.productId}>
              <span className="piloto-tablet__qty">{item.quantity}×</span>
              <span className="piloto-tablet__name">{item.name}</span>
              <span className="piloto-tablet__price">{formatCurrency(item.price * item.quantity)}</span>
              <button type="button" className="piloto-tablet__minus" onClick={() => void removeOne(item.productId)} aria-label={`Quitar uno de ${item.name}`}>
                −
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="piloto-tablet__empty">Todavía no hay productos.</p>
      )}

      <div className="piloto-tablet__footer">
        <div className="piloto-tablet__total">
          <span>
            {count} producto{count === 1 ? "" : "s"}
          </span>
          <strong>{formatCurrency(total)}</strong>
        </div>
        <button type="button" className={sent ? "piloto-tablet__send is-sent" : "piloto-tablet__send"} disabled={!items.length} onClick={() => void handleSend()}>
          {sent ? "✓ Enviado al mostrador" : "Enviar al mostrador"}
        </button>
        {items.length ? (
          <button type="button" className="piloto-tablet__clear" onClick={() => void handleClear()}>
            Borrar todo
          </button>
        ) : null}
      </div>
    </section>
  );
}
