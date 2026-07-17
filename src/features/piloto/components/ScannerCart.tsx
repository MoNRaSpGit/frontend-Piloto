import { useEffect, useState } from "react";
import type { CartItem } from "../piloto.types";

type ScannerCartProps = {
  items: CartItem[];
  lastScannedProductId: number | null;
  onAddOne: (productId: number) => void;
  onRemoveOne: (productId: number) => void;
  onEdit: (productId: number, changes: { name: string; price: number }) => void;
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

function EditItemModal({
  item,
  onClose,
  onSave
}: {
  item: CartItem;
  onClose: () => void;
  onSave: (changes: { name: string; price: number }) => void;
}) {
  const [name, setName] = useState(item.name);
  const [price, setPrice] = useState(String(item.price));
  const [error, setError] = useState("");

  useEffect(() => {
    setName(item.name);
    setPrice(String(item.price));
    setError("");
  }, [item]);

  function handleSave() {
    const trimmedName = name.trim();
    const parsedPrice = Number(price.replace(",", "."));

    if (!trimmedName) {
      setError("Ingresa un nombre.");
      return;
    }
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      setError("Ingresa un precio valido mayor a 0.");
      return;
    }

    onSave({ name: trimmedName, price: parsedPrice });
    onClose();
  }

  return (
    <div className="piloto-modal-overlay" role="dialog" aria-modal="true" aria-label="Editar producto">
      <div className="piloto-modal-card">
        <div className="piloto-modal-card__header">
          <h2>Editar producto</h2>
          <button type="button" className="piloto-modal-close" onClick={onClose}>
            Cerrar
          </button>
        </div>

        <label className="piloto-modal-field">
          <span>Nombre</span>
          <input value={name} onChange={(event) => setName(event.target.value)} />
        </label>

        <label className="piloto-modal-field">
          <span>Precio</span>
          <input value={price} onChange={(event) => setPrice(event.target.value)} inputMode="decimal" />
        </label>

        {error ? <p className="piloto-scanner-status piloto-scanner-status--error">{error}</p> : null}

        <div className="piloto-modal-card__actions">
          <button type="button" className="piloto-button piloto-button--ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="piloto-button piloto-button--primary" onClick={handleSave}>
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

export function ScannerCart({ items, lastScannedProductId, onAddOne, onRemoveOne, onEdit }: ScannerCartProps) {
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const editingItem = items.find((item) => item.productId === editingProductId) ?? null;

  if (!items.length) {
    return null;
  }

  return (
    <>
      <section className="piloto-cart-panel">
        <table className="piloto-cart-table">
          <thead>
            <tr>
              <th>Producto</th>
              <th className="text-center">Editar</th>
              <th className="text-end">Cant.</th>
              <th className="text-end">Total</th>
              <th className="text-end"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const isLatest = item.productId === lastScannedProductId;
              const lineTotal = item.price * item.quantity;

              return (
                <tr key={item.productId} className={isLatest ? "is-latest" : ""}>
                  <td
                    className="piloto-cart-table__product"
                    role="button"
                    tabIndex={0}
                    onClick={() => onAddOne(item.productId)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onAddOne(item.productId);
                      }
                    }}
                  >
                    <ProductThumb name={item.name} imageUrl={item.imageUrl} />
                    <div>
                      <div className="piloto-product-name">{item.name}</div>
                      <div className="piloto-price-badge">{formatCurrency(item.price)}</div>
                    </div>
                  </td>
                  <td className="text-center">
                    <button type="button" className="piloto-edit-btn" onClick={() => setEditingProductId(item.productId)}>
                      Editar
                    </button>
                  </td>
                  <td className="text-end piloto-cart-table__strong">{item.quantity}</td>
                  <td className="text-end piloto-cart-table__strong">{formatCurrency(lineTotal)}</td>
                  <td className="text-end">
                    <button
                      type="button"
                      className="piloto-cart-row__remove"
                      onClick={() => onRemoveOne(item.productId)}
                      aria-label={`Quitar una unidad de ${item.name}`}
                    >
                      x
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {editingItem ? (
        <EditItemModal
          item={editingItem}
          onClose={() => setEditingProductId(null)}
          onSave={(changes) => onEdit(editingItem.productId, changes)}
        />
      ) : null}
    </>
  );
}
