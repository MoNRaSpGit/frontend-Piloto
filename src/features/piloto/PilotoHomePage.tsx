import { useState } from "react";
import { toast } from "react-toastify";
import { createSale, findProductByBarcode } from "./piloto.api";
import { ScannerCart } from "./components/ScannerCart";
import { ScannerCheckout } from "./components/ScannerCheckout";
import { ScannerInput } from "./components/ScannerInput";
import { usePilotoCart } from "./hooks/usePilotoCart";
import type { PilotoPaymentMethod } from "./piloto.types";

export function PilotoHomePage() {
  const [barcodeInput, setBarcodeInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const { cartItems, lastScannedProductId, addProduct, addOne, removeOne, updateItem, clearCart, total } = usePilotoCart();

  async function handleSearch(barcode: string) {
    setIsLoading(true);
    setError("");

    try {
      const response = await findProductByBarcode(barcode);
      addProduct(response.item);
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : "No se pudo buscar el producto.");
    } finally {
      setIsLoading(false);
      setBarcodeInput("");
    }
  }

  async function handleCharge(paymentMethod: PilotoPaymentMethod) {
    try {
      await createSale(cartItems, paymentMethod);
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

      <ScannerInput value={barcodeInput} onChange={setBarcodeInput} onSubmit={handleSearch} isLoading={isLoading} error={error} />

      {cartItems.length ? (
        <>
          <ScannerCart
            items={cartItems}
            lastScannedProductId={lastScannedProductId}
            onAddOne={addOne}
            onRemoveOne={removeOne}
            onEdit={updateItem}
          />
          <ScannerCheckout total={total} onCharge={handleCharge} />
        </>
      ) : (
        <section className="piloto-empty-state">
          <p>Todavia no escaneaste ningun producto.</p>
        </section>
      )}
    </main>
  );
}
