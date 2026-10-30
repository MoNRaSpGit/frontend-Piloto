import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { findProductByBarcode, getFondoCart, setFondoCart, updateProduct } from "../piloto.api";
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
// lista (la MISMA del mostrador, con - + y Editar), el total y "Enviar"
// aparecen cuando hay algo escaneado. Sin carteles de aviso (pedido
// explicito: "sacale todos los otros datos").

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
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [lastScannedProductId, setLastScannedProductId] = useState<number | null>(null);
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
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
          setLastScannedProductId(null);
          setEditingProductId(null);
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

  // Editar: mismo criterio que el mostrador (PilotoHomePage
  // handleEditCartItem) -- los productos reales se corrigen tambien en el
  // catalogo; los manuales (id negativo) solo en esta lista.
  async function handleEdit(productId: number, changes: { name: string; price: number }) {
    if (productId > 0) {
      try {
        await updateProduct(productId, changes.name, changes.price);
        toast.success("Producto actualizado.");
      } catch (updateError) {
        toast.error(updateError instanceof Error ? updateError.message : "No se pudo guardar el producto.");
        return false;
      }
    }
    await save(itemsRef.current.map((item) => (item.productId === productId ? { ...item, ...changes } : item)));
    return true;
  }

  async function handleSend() {
    if (!itemsRef.current.length) return;
    await save(itemsRef.current, true);
    setFocusSignal((s) => s + 1);
  }

  async function handleClear() {
    if (!window.confirm("¿Borrar todos los productos?")) return;
    await save([]);
    setLastScannedProductId(null);
    setFocusSignal((s) => s + 1);
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
        onEdit={handleEdit}
        editingProductId={editingProductId}
        onSetEditingProductId={(productId) => {
          setEditingProductId(productId);
          if (productId === null) setFocusSignal((s) => s + 1);
        }}
      />

      {items.length ? (
        <div className="piloto-tablet__footer">
          <div className="piloto-tablet__total">
            <span>
              {count} producto{count === 1 ? "" : "s"}
            </span>
            <strong>{formatCurrency(total)}</strong>
          </div>
          <button type="button" className={sent ? "piloto-tablet__send is-sent" : "piloto-tablet__send"} onClick={() => void handleSend()}>
            {sent ? "✓ Enviado al mostrador" : "Enviar al mostrador"}
          </button>
          <button type="button" className="piloto-tablet__clear" onClick={() => void handleClear()}>
            Borrar todo
          </button>
        </div>
      ) : null}
    </section>
  );
}
