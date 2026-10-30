import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { findProductByBarcode, getFondoCart, setFondoCart } from "../piloto.api";
import type { CartItem } from "../piloto.types";
import { ManualProductModal } from "../components/ManualProductModal";
import { ScannerCart } from "../components/ScannerCart";
import { ScannerInput } from "../components/ScannerInput";

// Pestaña "Tablet" (30/10/2026, pedido explicito): la tablet del FONDO del
// local, con su propio lector. Lo que se escanea aca NO entra a ninguna
// caja: se guarda en el servidor como "la venta del fondo", y el mostrador
// la ve y la toma a su caja cuando quiere (ver FondoInbox.tsx). Asi no se
// mezclan los productos de dos clientes que se atienden al mismo tiempo.
// Pensada para una persona mayor: solo el escaner y "Producto manual"; la
// lista (la misma del mostrador, con - y +, sin Editar), el total y "Enviar"
// aparecen cuando hay algo escaneado. Sin carteles ni "Borrar todo": al
// enviar, la tablet queda vacia y empieza de nuevo (lo enviado queda
// esperando en el mostrador, ver piloto-fondo.service.ts en el backend).

const POLL_MS = 3000;
// Despues de guardar, se ignora un ratito lo que diga el servidor para no
// pisar con datos viejos un escaneo recien hecho.
const WRITE_GRACE_MS = 1500;

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("es-UY", { style: "currency", currency: "UYU", maximumFractionDigits: 0 }).format(amount);
}

export function PilotoTabletScreen() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [barcode, setBarcode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const [focusSignal, setFocusSignal] = useState(0);
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [lastScannedProductId, setLastScannedProductId] = useState<number | null>(null);
  const lastWriteRef = useRef(0);
  const itemsRef = useRef<CartItem[]>([]);
  itemsRef.current = items;

  async function save(next: CartItem[]) {
    setItems(next);
    itemsRef.current = next;
    lastWriteRef.current = Date.now();
    try {
      await setFondoCart(next, false);
    } catch {
      toast.error("No se pudo guardar en el servidor. Revisá la conexión.");
    }
  }

  // Al abrir, retoma lo que haya quedado sin enviar; despues, cada pocos
  // segundos se fija si el mostrador se lo llevo sin que se enviara.
  useEffect(() => {
    let cancelled = false;
    async function poll(initial: boolean) {
      if (!initial && Date.now() - lastWriteRef.current < WRITE_GRACE_MS) return;
      try {
        const cart = await getFondoCart();
        if (cancelled) return;
        if (initial) {
          setItems(cart.draftItems);
        } else if (cart.draftItems.length === 0 && itemsRef.current.length > 0) {
          setItems([]);
          setLastScannedProductId(null);
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
    try {
      const { item: product } = await findProductByBarcode(code);
      const current = itemsRef.current;
      const existing = current.find((item) => item.productId === product.id);
      const next = existing
        ? [{ ...existing, quantity: existing.quantity + 1 }, ...current.filter((item) => item.productId !== product.id)]
        : [{ productId: product.id, name: product.name, price: product.price, quantity: 1, imageUrl: product.imageUrl }, ...current];
      setLastScannedProductId(product.id);
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
    const manual: CartItem = { productId: -(Date.now() % 1_000_000_000), name: "Producto Manual", price, quantity: 1, imageUrl: null };
    setLastScannedProductId(manual.productId);
    await save([manual, ...itemsRef.current]);
    setFocusSignal((s) => s + 1);
  }

  async function changeQuantity(productId: number, delta: number) {
    const next = itemsRef.current
      .map((item) => (item.productId === productId ? { ...item, quantity: item.quantity + delta } : item))
      .filter((item) => item.quantity > 0);
    await save(next);
    setFocusSignal((s) => s + 1);
  }

  // Enviar: lo pasado queda esperando en el mostrador y la tablet arranca
  // vacia para el proximo cliente. Si falla, no se borra nada.
  async function handleSend() {
    const toSend = itemsRef.current;
    if (!toSend.length || isSending) return;
    setIsSending(true);
    lastWriteRef.current = Date.now();
    try {
      await setFondoCart(toSend, true);
      setItems([]);
      itemsRef.current = [];
      setLastScannedProductId(null);
    } catch {
      toast.error("No se pudo enviar. Revisá la conexión y probá de nuevo.");
    } finally {
      setIsSending(false);
      setFocusSignal((s) => s + 1);
    }
  }

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const count = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <section className="piloto-tablet">
      <ScannerInput
        value={barcode}
        onChange={setBarcode}
        onSubmit={(code) => void handleScan(code)}
        onEmptyEnter={() => undefined}
        isLoading={isLoading}
        error={error}
        focusSignal={focusSignal}
        noKeyboard
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

      <ScannerCart
        items={items}
        lastScannedProductId={lastScannedProductId}
        onAddOne={(productId) => void changeQuantity(productId, 1)}
        onRemoveOne={(productId) => void changeQuantity(productId, -1)}
        onEdit={async () => false}
        editingProductId={null}
        onSetEditingProductId={() => undefined}
        canEdit={false}
      />

      {items.length ? (
        <div className="piloto-tablet__footer">
          <div className="piloto-tablet__total">
            <span>
              {count} producto{count === 1 ? "" : "s"}
            </span>
            <strong>{formatCurrency(total)}</strong>
          </div>
          <button type="button" className="piloto-tablet__send" disabled={isSending} onClick={() => void handleSend()}>
            {isSending ? "Enviando…" : "Enviar al mostrador"}
          </button>
        </div>
      ) : null}
    </section>
  );
}
