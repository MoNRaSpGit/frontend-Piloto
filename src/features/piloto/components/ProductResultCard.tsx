import type { PilotoProduct } from "../piloto.types";

type ProductResultCardProps = {
  product: PilotoProduct;
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency: "UYU",
    maximumFractionDigits: 0
  }).format(amount);
}

export function ProductResultCard({ product }: ProductResultCardProps) {
  return (
    <article className="piloto-product-card">
      <div className="piloto-product-card__image">
        {product.imageUrl ? <img src={product.imageUrl} alt={product.name} /> : <span>Sin imagen</span>}
      </div>

      <div className="piloto-product-card__info">
        <h2>{product.name}</h2>
        <p className="piloto-product-card__barcode">Codigo: {product.barcode}</p>

        <div className="piloto-product-card__meta">
          <div>
            <span>Precio</span>
            <strong>{formatCurrency(product.price)}</strong>
          </div>
          <div>
            <span>Stock</span>
            <strong>{product.stock}</strong>
          </div>
          <div>
            <span>Estado</span>
            <strong>{product.status === "active" ? "Activo" : "Inactivo"}</strong>
          </div>
        </div>
      </div>
    </article>
  );
}
