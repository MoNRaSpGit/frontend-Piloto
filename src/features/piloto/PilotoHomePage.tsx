import { useState } from "react";
import { findProductByBarcode } from "./piloto.api";
import { ProductResultCard } from "./components/ProductResultCard";
import { ScannerInput } from "./components/ScannerInput";
import type { PilotoProduct } from "./piloto.types";

export function PilotoHomePage() {
  const [barcodeInput, setBarcodeInput] = useState("");
  const [product, setProduct] = useState<PilotoProduct | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch(barcode: string) {
    setIsLoading(true);
    setError(null);

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
        <p className="piloto-note">Escaneá o escribí un codigo de barras para ver los datos del producto.</p>
      </header>

      <section className="piloto-card">
        <ScannerInput value={barcodeInput} onChange={setBarcodeInput} onSubmit={handleSearch} isLoading={isLoading} />
        {error ? <p className="piloto-error">{error}</p> : null}
      </section>

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
