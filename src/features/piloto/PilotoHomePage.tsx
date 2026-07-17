import { useState } from "react";
import { findProductByBarcode } from "./piloto.api";
import { ProductResultCard } from "./components/ProductResultCard";
import { ScannerInput } from "./components/ScannerInput";
import type { PilotoProduct } from "./piloto.types";

export function PilotoHomePage() {
  const [barcodeInput, setBarcodeInput] = useState("");
  const [product, setProduct] = useState<PilotoProduct | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSearch(barcode: string) {
    setIsLoading(true);
    setError("");

    try {
      const response = await findProductByBarcode(barcode);
      setProduct(response.item);
    } catch (searchError) {
      setProduct(null);
      setError(searchError instanceof Error ? searchError.message : "No se pudo buscar el producto.");
    } finally {
      setIsLoading(false);
      setBarcodeInput("");
    }
  }

  return (
    <main className="piloto-shell">
      <header className="piloto-header">
        <p className="piloto-kicker">Piloto</p>
        <h1>Escaneo de productos</h1>
      </header>

      <ScannerInput value={barcodeInput} onChange={setBarcodeInput} onSubmit={handleSearch} isLoading={isLoading} error={error} />

      {product ? (
        <ProductResultCard product={product} />
      ) : (
        <section className="piloto-empty-state">
          <p>Todavia no buscaste ningun producto.</p>
        </section>
      )}
    </main>
  );
}
