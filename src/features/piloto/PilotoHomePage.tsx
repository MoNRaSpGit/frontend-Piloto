import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { createProduct, createSale, findProductByBarcode, normalizeBarcode } from "./piloto.api";
import { ScannerCart } from "./components/ScannerCart";
import { ScannerCheckout } from "./components/ScannerCheckout";
import { ScannerInput } from "./components/ScannerInput";
import { ScannerQuickAddModal } from "./components/ScannerQuickAddModal";
import { usePilotoCart } from "./hooks/usePilotoCart";
import { printSaleTicketByQz } from "./services/piloto.qzPrint";
import type { PilotoPaymentMethod } from "./piloto.types";

const NOT_FOUND_MESSAGE = "Producto no encontrado.";

export function PilotoHomePage() {
  const [barcodeInput, setBarcodeInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [focusSignal, setFocusSignal] = useState(0);
  const [quickAddBarcode, setQuickAddBarcode] = useState<string | null>(null);
  const { cartItems, lastScannedProductId, addProduct, addOne, removeOne, updateItem, clearCart, total } = usePilotoCart();

  // Al cerrarse el modal de cobro o el de alta rapida, devolver el foco
  // al input del escaner para seguir escaneando sin tocar el mouse.
  useEffect(() => {
    if (!isCheckoutOpen && !quickAddBarcode) {
      setFocusSignal((signal) => signal + 1);
    }
  }, [isCheckoutOpen, quickAddBarcode]);

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

  async function handleCharge(paymentMethod: PilotoPaymentMethod) {
    try {
      const ticketItems = cartItems;
      const ticketTotal = total;
      await createSale(cartItems, paymentMethod);
      clearCart();
      toast.success("Venta confirmada.");

      try {
        await printSaleTicketByQz({
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

      {cartItems.length ? (
        <>
          <ScannerCart
            items={cartItems}
            lastScannedProductId={lastScannedProductId}
            onAddOne={addOne}
            onRemoveOne={removeOne}
            onEdit={updateItem}
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
    </main>
  );
}
