import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { createProduct, createSale, findProductByBarcode, normalizeBarcode, updateProduct } from "./piloto.api";
import { ManualProductModal } from "./components/ManualProductModal";
import { ScannerCart } from "./components/ScannerCart";
import { ScannerCheckout } from "./components/ScannerCheckout";
import { ScannerInput } from "./components/ScannerInput";
import { ScannerQuickAddModal } from "./components/ScannerQuickAddModal";
import { usePilotoCart } from "./hooks/usePilotoCart";

const NOT_FOUND_MESSAGE = "Producto no encontrado.";
// Ya no se elige medio de pago en la UI (pedido explicito, 16/09/2026:
// "saca lo de tarjeta efectivo y demas") -- se manda siempre este valor
// fijo, tanto a la venta como al ticket.
const FIXED_PAYMENT_METHOD = "efectivo" as const;
// Atajo de teclado: cualquiera de las 4 flechas abre "Producto manual".
const ARROW_KEYS = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);

export function PilotoHomePage() {
  const [barcodeInput, setBarcodeInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [focusSignal, setFocusSignal] = useState(0);
  const [quickAddBarcode, setQuickAddBarcode] = useState<string | null>(null);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  // Vive aca (no adentro de ScannerCart) para que el efecto de mas abajo
  // se entere de cuando este modal se abre/cierra tambien -- pedido
  // explicito (16/09/2026): "cierro un producto... siempre el cursor
  // vuelve al input".
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const { cartItems, lastScannedProductId, addProduct, addManualItem, addOne, removeOne, updateItem, clearCart, total } =
    usePilotoCart();

  // Al cerrarse CUALQUIER modal (cobro, alta rapida, producto manual o
  // edicion de un producto del carrito), devolver el foco al input del
  // escaner para seguir escaneando sin tocar el mouse -- pedido
  // explicito (16/09/2026): "cada accion que se haga luego vuelva al
  // input del escaner, ya sea que cierro un producto, cobro, o hago
  // cualquier otra cosa".
  useEffect(() => {
    if (!isCheckoutOpen && !quickAddBarcode && !isManualModalOpen && editingProductId === null) {
      setFocusSignal((signal) => signal + 1);
    }
  }, [isCheckoutOpen, quickAddBarcode, isManualModalOpen, editingProductId]);

  // Atajo de teclado (20/09/2026, pedido explicito: "cambiar de boton a las
  // flechitas... a esas, a las 4 flechas, sin importar q flecha apreta abrir
  // producto manual, y saca lo del espacio"). Cualquiera de las 4 flechas
  // abre "Producto manual", igual que si se clickeara el boton. No debe
  // interferir si el usuario esta escribiendo/navegando en un campo editable
  // (por ejemplo el precio, o un select) ni duplicar modales si ya hay otro
  // abierto.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!ARROW_KEYS.has(event.key)) return;

      const target = event.target as HTMLElement | null;
      const isEditable =
        !!target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable);
      if (isEditable) return;

      if (isManualModalOpen || isCheckoutOpen || quickAddBarcode || editingProductId !== null) return;

      // preventDefault: que la flecha no mueva el foco entre botones ni
      // haga scroll de la pagina.
      event.preventDefault();
      setIsManualModalOpen(true);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isManualModalOpen, isCheckoutOpen, quickAddBarcode, editingProductId]);

  function handleEmptyEnter() {
    if (!cartItems.length) return;
    setIsCheckoutOpen(true);
  }

  // El boton "x" (y la fila del producto, para sumar 1 mas) del carrito
  // le sacan el foco al buscador -- queda en el propio elemento
  // clickeado, foco nativo del navegador. Se reenfoca igual que al
  // cerrar cualquier modal, para poder seguir escaneando sin tocar el
  // mouse.
  function handleRemoveOne(productId: number) {
    removeOne(productId);
    setFocusSignal((signal) => signal + 1);
  }

  function handleAddOne(productId: number) {
    addOne(productId);
    setFocusSignal((signal) => signal + 1);
  }

  async function handleSearch(barcode: string) {
    setIsLoading(true);
    setError("");

    try {
      const response = await findProductByBarcode(barcode);
      addProduct(response.item);
    } catch (searchError) {
      const message = searchError instanceof Error ? searchError.message : "No se pudo buscar el producto.";
      if (message === NOT_FOUND_MESSAGE) {
        setQuickAddBarcode(normalizeBarcode(barcode));
      } else {
        setError(message);
      }
    } finally {
      setIsLoading(false);
      setBarcodeInput("");
    }
  }

  async function handleQuickAddConfirm(name: string, price: number) {
    if (!quickAddBarcode) return false;

    try {
      const response = await createProduct(quickAddBarcode, name, price);
      addProduct(response.item);
      setQuickAddBarcode(null);
      // Empuje explicito ademas del efecto general que reenfoca al cerrar
      // cualquier modal -- asi el proximo escaneo cae siempre en el
      // buscador, sin depender de que ese efecto llegue a tiempo.
      setFocusSignal((signal) => signal + 1);
      return true;
    } catch (createError) {
      toast.error(createError instanceof Error ? createError.message : "No se pudo guardar el producto.");
      return false;
    }
  }

  async function handleEditCartItem(productId: number, changes: { name: string; price: number }) {
    // Ids negativos son lineas manuales locales (sin producto real en el
    // catalogo): solo se actualiza el carrito, no hay nada que guardar en la BD.
    if (productId <= 0) {
      updateItem(productId, changes);
      return true;
    }

    try {
      await updateProduct(productId, changes.name, changes.price);
      updateItem(productId, changes);
      toast.success("Producto actualizado.");
      return true;
    } catch (updateError) {
      toast.error(updateError instanceof Error ? updateError.message : "No se pudo guardar el producto.");
      return false;
    }
  }

  function handleManualConfirm(price: number) {
    addManualItem(price);
    setIsManualModalOpen(false);
  }

  // Pedido explicito (18/09/2026): "quitale cualquier cosa que tenga para
  // imprimir, todavia no vamos a imprimir... que ponga cobrar y que cobre
  // y chao, y empiece todo de vuelta". Se sacó el intento de imprimir
  // (printSaleTicket) que tiraba el cartel de "no encontro dispositivo" --
  // por ahora la venta se confirma y listo, sin tocar nada de impresion.
  async function handleCharge() {
    try {
      await createSale(cartItems, FIXED_PAYMENT_METHOD);
      clearCart();
      toast.success("Venta confirmada.");
      return true;
    } catch (chargeError) {
      toast.error(chargeError instanceof Error ? chargeError.message : "No se pudo confirmar la venta.");
      return false;
    }
  }

  return (
    <main className="piloto-shell">
      <header className="piloto-header">
        <p className="piloto-kicker">Piloto</p>
        <h1>Escaneo de productos</h1>
      </header>

      <ScannerInput
        value={barcodeInput}
        onChange={setBarcodeInput}
        onSubmit={handleSearch}
        onEmptyEnter={handleEmptyEnter}
        isLoading={isLoading}
        error={error}
        focusSignal={focusSignal}
      />

      <button type="button" className="piloto-manual-btn" onClick={() => setIsManualModalOpen(true)}>
        Producto Manual
      </button>

      {cartItems.length ? (
        <>
          <ScannerCart
            items={cartItems}
            lastScannedProductId={lastScannedProductId}
            onAddOne={handleAddOne}
            onRemoveOne={handleRemoveOne}
            onEdit={handleEditCartItem}
            editingProductId={editingProductId}
            onSetEditingProductId={setEditingProductId}
          />
          <ScannerCheckout
            total={total}
            isOpen={isCheckoutOpen}
            onOpen={() => setIsCheckoutOpen(true)}
            onClose={() => setIsCheckoutOpen(false)}
            onCharge={handleCharge}
          />
        </>
      ) : (
        <section className="piloto-empty-state">
          <p>Todavia no escaneaste ningun producto.</p>
        </section>
      )}

      {quickAddBarcode ? (
        <ScannerQuickAddModal
          barcode={quickAddBarcode}
          onClose={() => setQuickAddBarcode(null)}
          onConfirm={handleQuickAddConfirm}
        />
      ) : null}

      {isManualModalOpen ? (
        <ManualProductModal onClose={() => setIsManualModalOpen(false)} onConfirm={handleManualConfirm} />
      ) : null}
    </main>
  );
}
