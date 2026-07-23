import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { createProduct, createSale, findProductByBarcode, normalizeBarcode, updateProduct } from "./piloto.api";
import { ManualProductModal } from "./components/ManualProductModal";
import { ScannerCart } from "./components/ScannerCart";
import { ScannerCheckout } from "./components/ScannerCheckout";
import { ScannerInput } from "./components/ScannerInput";
import { ScannerQuickAddModal } from "./components/ScannerQuickAddModal";
import { usePilotoCart } from "./hooks/usePilotoCart";
import { printSaleTicket } from "./services/piloto.print";
import { primeUsbPrinterConnection } from "./services/piloto.webusbPrint";
import type { PilotoPaymentMethod } from "./piloto.types";

const NOT_FOUND_MESSAGE = "Producto no encontrado.";

export function PilotoHomePage() {
  const [barcodeInput, setBarcodeInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [focusSignal, setFocusSignal] = useState(0);
  const [quickAddBarcode, setQuickAddBarcode] = useState<string | null>(null);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const { cartItems, lastScannedProductId, addProduct, addManualItem, addOne, removeOne, updateItem, clearCart, total } =
    usePilotoCart();

  // Reconecta en silencio la impresora USB ya autorizada en una sesion
  // anterior (no pide permiso de nuevo, solo la vuelve a encontrar).
  useEffect(() => {
    void primeUsbPrinterConnection().catch(() => {});
  }, []);

  // Al cerrarse cualquier modal, devolver el foco al input del escaner
  // para seguir escaneando sin tocar el mouse.
  useEffect(() => {
    if (!isCheckoutOpen && !quickAddBarcode && !isManualModalOpen) {
      setFocusSignal((signal) => signal + 1);
    }
  }, [isCheckoutOpen, quickAddBarcode, isManualModalOpen]);

  function handleEmptyEnter() {
    if (!cartItems.length) return;
    setIsCheckoutOpen(true);
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

  async function handleCharge(paymentMethod: PilotoPaymentMethod) {
    try {
      const ticketItems = cartItems;
      const ticketTotal = total;
      await createSale(cartItems, paymentMethod);
      clearCart();
      toast.success("Venta confirmada.");

      try {
        await printSaleTicket({
          externalId: `piloto-${Date.now()}`,
          chargedAtIso: new Date().toISOString(),
          paymentMethod,
          items: ticketItems,
          total: ticketTotal
        });
      } catch (printError) {
        toast.error(printError instanceof Error ? `No se pudo imprimir: ${printError.message}` : "No se pudo imprimir el ticket.");
      }

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
            onAddOne={addOne}
            onRemoveOne={removeOne}
            onEdit={handleEditCartItem}
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
