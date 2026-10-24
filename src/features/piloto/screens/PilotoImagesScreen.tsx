import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { listProducts } from "../piloto.api";
import type { PilotoProduct } from "../piloto.types";

// "Imagenes" (24/10/2026, pedido explicito): pestana de prueba para ver,
// dentro de la app real, que las imagenes migradas a Cloudinary se vean
// bien. Filtra por los 10 productos que se migraron en la primera tanda
// de prueba -- una vez confirmado, se puede migrar el resto y esta
// pestana deja de hacer falta.
const MIGRATED_PRODUCT_IDS = [1, 2, 3, 4, 5, 6, 9, 10, 11, 12];

export function PilotoImagesScreen() {
  const [products, setProducts] = useState<PilotoProduct[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  function load() {
    setLoadError(null);
    setProducts(null);
    listProducts(MIGRATED_PRODUCT_IDS)
      .then(setProducts)
      .catch((error) => {
        const message = error instanceof Error ? error.message : "No se pudieron cargar los productos.";
        setLoadError(message);
        toast.error(message);
      });
  }

  useEffect(() => {
    load();
  }, []);

  if (loadError) {
    return (
      <section className="piloto-empty-state">
        <p>No se pudo cargar: {loadError}</p>
        <button type="button" className="piloto-manual-btn" onClick={load}>
          Reintentar
        </button>
      </section>
    );
  }

  if (!products) {
    return <p className="piloto-scanner-status">Cargando imagenes...</p>;
  }

  return (
    <div className="piloto-dashboard">
      <p className="piloto-dashboard-date">Productos migrados a Cloudinary ({products.length} de {MIGRATED_PRODUCT_IDS.length})</p>

      <ul className="piloto-dashboard-movements">
        {products.map((product) => (
          <li key={product.id} className="piloto-dashboard-movement" style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.name}
                style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 8, flexShrink: 0 }}
              />
            ) : (
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 8,
                  flexShrink: 0,
                  background: "#e2e2e2",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  color: "#777"
                }}
              >
                Sin foto
              </div>
            )}
            <div>
              <strong>#{product.id} - {product.name}</strong>
              <p className="piloto-dashboard-movement__items">{product.imageUrl ?? "sin imagen"}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
