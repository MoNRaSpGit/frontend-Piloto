import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { PriceEntryModal } from "../components/PriceEntryModal";
import { createPriceEntry, deletePriceEntry, listPriceEntries, updatePriceEntry } from "../piloto.api";
import type { PilotoPriceCategory, PilotoPriceEntry } from "../piloto.types";

// "Precios" -- Modo Pro (23/09/2026, pedido explicito): lista organizada
// de precios por categoria, independiente de los productos reales del
// escaner (no se convierten en productos del carrito). 4 categorias fijas,
// sin buscador por ahora (pocos productos).
const PRICE_CATEGORIES: { id: PilotoPriceCategory; label: string }[] = [
  { id: "congelados", label: "Congelados" },
  { id: "frutas_verduras", label: "Frutas y verduras" },
  { id: "empanadas", label: "Empanadas" },
  { id: "otros", label: "Otros" }
];

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency: "UYU",
    maximumFractionDigits: 0
  }).format(amount);
}

export function PilotoPricesScreen() {
  const [activeCategory, setActiveCategory] = useState<PilotoPriceCategory>(PRICE_CATEGORIES[0].id);
  const [entries, setEntries] = useState<PilotoPriceEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<PilotoPriceEntry | null>(null);

  function loadEntries() {
    setIsLoading(true);
    setLoadError(null);
    return listPriceEntries()
      .then((result) => setEntries(result.items))
      .catch((error) => {
        const message = error instanceof Error ? error.message : "No se pudieron cargar los precios.";
        setLoadError(message);
        toast.error(message);
      })
      .finally(() => setIsLoading(false));
  }

  useEffect(() => {
    void loadEntries();
  }, []);

  const activeCategoryLabel = PRICE_CATEGORIES.find((category) => category.id === activeCategory)?.label ?? "";
  const visibleEntries = entries.filter((entry) => entry.category === activeCategory);

  async function handleSave(name: string, price: number) {
    try {
      if (editingEntry) {
        const result = await updatePriceEntry(editingEntry.id, name, price);
        setEntries((current) => current.map((entry) => (entry.id === result.item.id ? result.item : entry)));
        toast.success("Precio actualizado.");
      } else {
        const result = await createPriceEntry(activeCategory, name, price);
        setEntries((current) => [...current, result.item]);
        toast.success("Precio agregado.");
      }
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar el precio.");
      return false;
    }
  }

  async function handleDelete(entry: PilotoPriceEntry) {
    if (!window.confirm(`Eliminar "${entry.name}"?`)) return;

    try {
      await deletePriceEntry(entry.id);
      setEntries((current) => current.filter((item) => item.id !== entry.id));
      toast.success("Precio eliminado.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo eliminar.");
    }
  }

  return (
    <>
      <div className="piloto-price-tabs" role="tablist" aria-label="Categorias de precios">
        {PRICE_CATEGORIES.map((category) => (
          <button
            key={category.id}
            type="button"
            role="tab"
            aria-selected={category.id === activeCategory}
            className={category.id === activeCategory ? "piloto-price-tab is-active" : "piloto-price-tab"}
            onClick={() => setActiveCategory(category.id)}
          >
            {category.label}
          </button>
        ))}
      </div>

      <button
        type="button"
        className="piloto-manual-btn"
        onClick={() => {
          setEditingEntry(null);
          setIsModalOpen(true);
        }}
      >
        + Agregar
      </button>

      {isLoading ? (
        <p className="piloto-scanner-status">Cargando precios...</p>
      ) : loadError ? (
        <section className="piloto-empty-state">
          <p>No se pudieron cargar los precios: {loadError}</p>
          <button type="button" className="piloto-manual-btn" onClick={loadEntries}>
            Reintentar
          </button>
        </section>
      ) : visibleEntries.length ? (
        <section className="piloto-cart-panel">
          <table className="piloto-cart-table">
            <thead>
              <tr>
                <th>Producto</th>
                <th className="text-end">Precio</th>
                <th className="text-center">Editar</th>
                <th className="text-center piloto-cart-table__remove-col">Quitar</th>
              </tr>
            </thead>
            <tbody>
              {visibleEntries.map((entry) => (
                <tr key={entry.id}>
                  <td className="piloto-cart-table__product">
                    <div className="piloto-product-name">{entry.name}</div>
                  </td>
                  <td className="text-end piloto-cart-table__strong">{formatCurrency(entry.price)}</td>
                  <td className="text-center">
                    <button
                      type="button"
                      className="piloto-edit-btn"
                      onClick={() => {
                        setEditingEntry(entry);
                        setIsModalOpen(true);
                      }}
                    >
                      Editar
                    </button>
                  </td>
                  <td className="piloto-cart-table__remove-col">
                    <button
                      type="button"
                      className="piloto-cart-row__remove"
                      onClick={() => void handleDelete(entry)}
                      aria-label={`Eliminar ${entry.name}`}
                      title="Eliminar"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : (
        <section className="piloto-empty-state">
          <p>Todavia no hay precios en {activeCategoryLabel}.</p>
        </section>
      )}

      {isModalOpen ? (
        <PriceEntryModal
          entry={editingEntry}
          categoryLabel={activeCategoryLabel}
          onClose={() => setIsModalOpen(false)}
          onSave={async (name, price) => {
            const ok = await handleSave(name, price);
            if (ok) setIsModalOpen(false);
            return ok;
          }}
        />
      ) : null}
    </>
  );
}
