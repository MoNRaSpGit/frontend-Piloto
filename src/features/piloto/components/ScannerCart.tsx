import { useEffect, useRef, useState, type FormEvent } from "react";
import { useEscapeToCancel } from "../hooks/useEscapeToCancel";
import type { CartItem } from "../piloto.types";

type ScannerCartProps = {
  items: CartItem[];
  lastScannedProductId: number | null;
  onAddOne: (productId: number) => void;
  onRemoveOne: (productId: number) => void;
  onEdit: (productId: number, changes: { name: string; price: number }) => Promise<boolean>;
  // Se maneja en el padre (PilotoHomePage), no adentro de este
  // componente, para que el efecto general que devuelve el foco al
  // buscador tambien se entere de cuando este modal se abre/cierra
  // (pedido explicito, 16/09/2026: "cierro un producto... siempre el
  // cursor vuelve al input").
  editingProductId: number | null;
  onSetEditingProductId: (productId: number | null) => void;
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
  onSave: (changes: { name: string; price: number }) => Promise<boolean>;
}) {
  // "S/N" (Sin Nombre) es el valor que se guarda cuando el producto se creo
  // sin nombre (ver ScannerQuickAddModal, mas abajo en este mismo archivo)
  // -- pedido explicito (21/09/2026): que nunca aparezca como texto real
  // dentro del input, siempre como placeholder, para no tener que borrarlo
  // a mano antes de escribir el nombre real.
  const [name, setName] = useState(item.name === "S/N" ? "" : item.name);
  const [price, setPrice] = useState(String(item.price));
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const priceInputRef = useRef<HTMLInputElement>(null);

  // ESC = Cancelar (pedido explicito, 22/09/2026) -- no cancela mientras
  // se esta guardando, igual que el boton Cancelar (ver disabled mas abajo).
  useEscapeToCancel(!isSaving, onClose);

  useEffect(() => {
    setName(item.name === "S/N" ? "" : item.name);
    setPrice(String(item.price));
    setError("");
  }, [item]);

  // Pedido explicito (20/09/2026): "editar producto -> completar los campos
  // -> Enter = confirmar/guardar". El cursor arranca en el PRECIO (lo que
  // mas se corrige en un POS), seleccionado, listo para tipear encima.
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      priceInputRef.current?.focus();
      priceInputRef.current?.select();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  // Es un <form>: Enter en cualquiera de los dos campos guarda. Si falta un
  // dato obligatorio, el cursor va directo a ese campo en vez de solo
  // mostrar el cartel.
  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaving) return;

    // Sin nombre se guarda como "S/N" (mismo criterio que ScannerQuickAddModal,
    // mas abajo) -- pedido explicito (21/09/2026): "S/N" nunca se carga como
    // texto editable en el input (ver el useState de name, arriba), pero se
    // sigue pudiendo guardar sin nombre igual que antes.
    const trimmedName = name.trim() || "S/N";
    const parsedPrice = Number(price.replace(",", "."));

    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      setError("Ingresa un precio valido mayor a 0.");
      priceInputRef.current?.focus();
      priceInputRef.current?.select();
      return;
    }

    setError("");
    setIsSaving(true);
    const ok = await onSave({ name: trimmedName, price: parsedPrice });
    setIsSaving(false);

    if (ok) {
      onClose();
    } else {
      setError("No se pudo guardar el cambio. Intenta de nuevo.");
    }
  }

  return (
    <div className="piloto-modal-overlay" role="dialog" aria-modal="true" aria-label="Editar producto">
      <div className="piloto-modal-card">
        <div className="piloto-modal-card__header">
          <h2>Editar producto</h2>
          <button type="button" className="piloto-modal-close" onClick={onClose} disabled={isSaving}>
            Cerrar
          </button>
        </div>

        <form onSubmit={handleSave}>
          <label className="piloto-modal-field">
            <span>Nombre</span>
            <input
              ref={nameInputRef}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="S/N"
              disabled={isSaving}
              autoComplete="off"
            />
          </label>

          <label className="piloto-modal-field">
            <span>Precio</span>
            <input
              ref={priceInputRef}
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              inputMode="decimal"
              disabled={isSaving}
            />
          </label>

          {error ? <p className="piloto-scanner-status piloto-scanner-status--error">{error}</p> : null}

          <div className="piloto-modal-card__actions">
            <button type="button" className="piloto-button piloto-button--danger" onClick={onClose} disabled={isSaving}>
              Cancelar
            </button>
            <button type="submit" className="piloto-button piloto-button--primary" disabled={isSaving}>
              {isSaving ? "Guardando..." : "Guardar"}
            </button>
          </div>
          <p className="piloto-enter-hint">Tecla Enter = Guardar</p>
        </form>
      </div>
    </div>
  );
}

export function ScannerCart({
  items,
  lastScannedProductId,
  onAddOne,
  onRemoveOne,
  onEdit,
  editingProductId,
  onSetEditingProductId
}: ScannerCartProps) {
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
              <th className="text-center">Cant.</th>
              <th className="text-end">Total</th>
              <th className="text-center piloto-cart-table__remove-col">Quitar</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const isLatest = item.productId === lastScannedProductId;
              const lineTotal = item.price * item.quantity;

              return (
                <tr key={item.productId} className={isLatest ? "is-latest" : ""}>
                  <td className="piloto-cart-table__product">
                    <ProductThumb name={item.name} imageUrl={item.imageUrl} />
                    <div>
                      <div className="piloto-product-name">{item.name}</div>
                      <div className="piloto-price-badge">{formatCurrency(item.price)}</div>
                    </div>
                  </td>
                  <td className="text-center">
                    <button type="button" className="piloto-edit-btn" onClick={() => onSetEditingProductId(item.productId)}>
                      Editar
                    </button>
                  </td>
                  <td className="text-center piloto-cart-table__strong">
                    {/* Pedido explicito (25/09/2026): "- 20 +" con botones
                        grandes, para sumar/restar sin apuntar al producto. */}
                    <div className="piloto-qty-stepper">
                      <button
                        type="button"
                        className="piloto-qty-btn"
                        onClick={() => onRemoveOne(item.productId)}
                        aria-label={`Quitar una unidad de ${item.name}`}
                      >
                        −
                      </button>
                      <span className="piloto-qty-value">{item.quantity}</span>
                      <button
                        type="button"
                        className="piloto-qty-btn"
                        onClick={() => onAddOne(item.productId)}
                        aria-label={`Sumar una unidad de ${item.name}`}
                      >
                        +
                      </button>
                    </div>
                  </td>
                  <td className="text-end piloto-cart-table__strong">{formatCurrency(lineTotal)}</td>
                  <td className="piloto-cart-table__remove-col">
                    <button
                      type="button"
                      className="piloto-cart-row__remove"
                      onClick={() => onRemoveOne(item.productId)}
                      aria-label={`Quitar una unidad de ${item.name}`}
                      title="Quitar"
                    >
                      ✕
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
          onClose={() => onSetEditingProductId(null)}
          onSave={(changes) => onEdit(editingItem.productId, changes)}
        />
      ) : null}
    </>
  );
}
