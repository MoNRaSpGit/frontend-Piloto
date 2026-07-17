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

function ProductThumb({ name, imageUrl }: { name: string; imageUrl: string | null }) {
  if (imageUrl) {
    return (
      <div className="piloto-thumb-frame">
        <img src={imageUrl} alt={name} loading="lazy" className="piloto-thumb" />
      </div>
    );
  }

  return (
    <div className="piloto-thumb-frame piloto-thumb-placeholder">
      <span>IMG</span>
    </div>
  );
}

export function ProductResultCard({ product }: ProductResultCardProps) {
  return (
    <article className="piloto-product-row">
      <ProductThumb name={product.name} imageUrl={product.imageUrl} />

      <div className="piloto-product-row__info">
        <div className="piloto-product-name">{product.name}</div>
        <div className="piloto-price-badge">{formatCurrency(product.price)}</div>

        <div className="piloto-product-row__meta">
          <span>Codigo {product.barcode}</span>
          <span>Stock {product.stock}</span>
          {product.status === "inactive" ? <span className="piloto-status-flag">Inactivo</span> : null}
        </div>
      </div>
    </article>
  );
}
