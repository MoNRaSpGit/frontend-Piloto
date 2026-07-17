import type { CartItem } from "../piloto.types";

type ScannerCartProps = {
  items: CartItem[];
  lastScannedProductId: number | null;
  onAddOne: (productId: number) => void;
  onRemoveOne: (productId: number) => void;
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

export function ScannerCart({ items, lastScannedProductId, onAddOne, onRemoveOne }: ScannerCartProps) {
  if (!items.length) {
    return null;
  }

  return (
    <section className="piloto-cart-panel">
      {items.map((item) => {
        const isLatest = item.productId === lastScannedProductId;
        const lineTotal = item.price * item.quantity;

        return (
          <article key={item.productId} className={`piloto-cart-row ${isLatest ? "is-latest" : ""}`}>
            <button
              type="button"
              className="piloto-cart-row__main"
              onClick={() => onAddOne(item.productId)}
              aria-label={`Sumar una unidad de ${item.name}`}
            >
              <ProductThumb name={item.name} imageUrl={item.imageUrl} />
              <div className="piloto-product-row__info">
                <div className="piloto-product-name">{item.name}</div>
                <div className="piloto-price-badge">{formatCurrency(item.price)}</div>
              </div>
            </button>

            <div className="piloto-cart-row__totals">
              <span className="piloto-cart-row__qty">x{item.quantity}</span>
              <strong>{formatCurrency(lineTotal)}</strong>
            </div>

            <button
              type="button"
              className="piloto-cart-row__remove"
              onClick={() => onRemoveOne(item.productId)}
              aria-label={`Quitar una unidad de ${item.name}`}
            >
              x
            </button>
          </article>
        );
      })}
    </section>
  );
}
