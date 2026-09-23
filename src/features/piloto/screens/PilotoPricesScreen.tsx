import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { AddToRegisterModal } from "../components/AddToRegisterModal";
import { CategoryIcon } from "../components/CategoryIcon";
import { PriceEntryModal } from "../components/PriceEntryModal";
import type { PilotoRegisterId } from "../hooks/usePilotoCart";
import { createPriceEntry, deletePriceEntry, listPriceEntries, updatePriceEntry } from "../piloto.api";
import type { PilotoPriceCategory, PilotoPriceEntry } from "../piloto.types";

type PilotoPricesScreenProps = {
  registers: { id: PilotoRegisterId; count: number }[];
  defaultRegisterId: PilotoRegisterId;
  onAddToRegister: (registerId: PilotoRegisterId, price: number, name: string) => void;
};

// "Precios" -- Modo Pro (23/09/2026, pedido explicito): lista organizada
// de precios por categoria, independiente de los productos reales del
// escaner (no se convierten en productos del carrito). 4 categorias fijas,
// sin buscador por ahora (pocos productos).
//
// Todas las clases visuales de esta pantalla son propias
// (piloto-prices-*), NO se reusan las del carrito/escaner -- esos
// componentes tambien los usa el Modo Basico, y la mejora visual de
// 24/09/2026 fue pedida SOLO para Pro, sin tocar el look del Basico.
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

export function PilotoPricesScreen({ registers, defaultRegisterId, onAddToRegister }: PilotoPricesScreenProps) {
  const [activeCategory, setActiveCategory] = useState<PilotoPriceCategory>(PRICE_CATEGORIES[0].id);
  const [entries, setEntries] = useState<PilotoPriceEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<PilotoPriceEntry | null>(null);
  // "Agregar a la venta" (23/09/2026, pedido explicito): que precio se
  // esta por mandar a una caja -- null = el modal de elegir caja esta
  // cerrado.
  const [addingEntry, setAddingEntry] = useState<PilotoPriceEntry | null>(null);

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

  // Pedido explicito: "el boton Agregar utiliza el precio que esta
  // configurado actualmente en Precios" -- toma entry.price tal como esta
  // en ese momento (si se edito antes, ya es el precio nuevo).
  function handleConfirmAddToRegister(registerId: PilotoRegisterId) {
    if (!addingEntry) return;
    onAddToRegister(registerId, addingEntry.price, addingEntry.name);
    toast.success(`${addingEntry.name} agregado a Caja ${registerId}.`);
    setAddingEntry(null);
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
    <div className="piloto-prices">
      <div className="piloto-prices-tabs" role="tablist" aria-label="Categorias de precios">
        {PRICE_CATEGORIES.map((category) => (
          <button
            key={category.id}
            type="button"
            role="tab"
            aria-selected={category.id === activeCategory}
            className={category.id === activeCategory ? "piloto-prices-tab is-active" : "piloto-prices-tab"}
            onClick={() => setActiveCategory(category.id)}
          >
            <CategoryIcon category={category.id} size={19} />
            {category.label}
          </button>
        ))}
      </div>

      <div className="piloto-prices-toolbar">
        <h2 className="piloto-prices-heading">
          <CategoryIcon category={activeCategory} size={22} />
          {activeCategoryLabel}
        </h2>
        <button
          type="button"
          className="piloto-prices-add-btn"
          onClick={() => {
            setEditingEntry(null);
            setIsModalOpen(true);
          }}
        >
          <span aria-hidden="true">+</span> Agregar
        </button>
      </div>

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
        <section className="piloto-prices-panel">
          <table className="piloto-prices-table">
            <thead>
              <tr>
                <th>Producto</th>
                <th className="text-end">Precio</th>
                <th className="text-center">Agregar</th>
                <th className="text-center">Editar</th>
                <th className="text-center piloto-prices-table__action-col">Quitar</th>
              </tr>
            </thead>
            <tbody>
              {visibleEntries.map((entry) => (
                <tr key={entry.id}>
                  <td>
                    <div className="piloto-prices-row-name">{entry.name}</div>
                  </td>
                  <td className="text-end piloto-prices-row-price">{formatCurrency(entry.price)}</td>
                  <td className="text-center">
                    <button
                      type="button"
                      className="piloto-prices-action-btn piloto-prices-action-btn--add"
                      onClick={() => setAddingEntry(entry)}
                    >
                      Agregar
                    </button>
                  </td>
                  <td className="text-center">
                    <button
                      type="button"
                      className="piloto-prices-action-btn"
                      onClick={() => {
                        setEditingEntry(entry);
                        setIsModalOpen(true);
                      }}
                    >
                      Editar
                    </button>
                  </td>
                  <td className="piloto-prices-table__action-col">
                    <button
                      type="button"
                      className="piloto-prices-remove-btn"
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

      {addingEntry ? (
        <AddToRegisterModal
          itemLabel={`${addingEntry.name} — ${formatCurrency(addingEntry.price)}`}
          registers={registers}
          defaultRegisterId={defaultRegisterId}
          onConfirm={handleConfirmAddToRegister}
          onClose={() => setAddingEntry(null)}
        />
      ) : null}
    </div>
  );
}
