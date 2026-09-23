import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { getSalesSummary } from "../piloto.api";
import type { PilotoSalesSummary } from "../piloto.types";

// "Panel de control" -- Modo Pro (24/09/2026, pedido explicito): "las
// ventas, o sea la suma de las ventas, y al lado la ganancia que seria
// un 30% de esa venta, y luego un sector que diga movimientos que es el
// que va a mostrar las ventas realizadas... venta #1, articulo, leche,
// pan, etc". Por ahora muestra el dia de hoy (sin selector de fecha
// todavia -- se puede agregar despues si hace falta).
function formatCurrency(amount: number) {
  return new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency: "UYU",
    maximumFractionDigits: 0
  }).format(amount);
}

function formatTime(isoDate: string) {
  return new Date(isoDate).toLocaleTimeString("es-UY", {
    timeZone: "America/Montevideo",
    hour: "2-digit",
    minute: "2-digit"
  });
}

// Mostrar solo las primeras 5 y esconder el resto detras de un boton
// (24/09/2026, pedido explicito: "muy similar al panel de control de el
// Joker") -- mismo patron que JokerPanelScreen: una constante, un
// booleano showAll, slice, y un boton "Ver todos"/"Ver menos" al lado
// del titulo de la seccion, solo si hay algo escondido.
const MOVEMENTS_PREVIEW_COUNT = 5;

export function PilotoDashboardScreen() {
  const [summary, setSummary] = useState<PilotoSalesSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showAllMovements, setShowAllMovements] = useState(false);

  function loadSummary() {
    setIsLoading(true);
    setLoadError(null);
    return getSalesSummary()
      .then(setSummary)
      .catch((error) => {
        const message = error instanceof Error ? error.message : "No se pudo cargar el panel.";
        setLoadError(message);
        toast.error(message);
      })
      .finally(() => setIsLoading(false));
  }

  useEffect(() => {
    void loadSummary();
  }, []);

  if (isLoading) {
    return <p className="piloto-scanner-status">Cargando panel...</p>;
  }

  if (loadError || !summary) {
    return (
      <section className="piloto-empty-state">
        <p>No se pudo cargar el panel: {loadError}</p>
        <button type="button" className="piloto-manual-btn" onClick={loadSummary}>
          Reintentar
        </button>
      </section>
    );
  }

  return (
    <div className="piloto-dashboard">
      <p className="piloto-dashboard-date">Hoy, {summary.date}</p>

      <div className="piloto-dashboard-stats">
        <div className="piloto-dashboard-stat">
          <span className="piloto-dashboard-stat__label">Ventas</span>
          <strong className="piloto-dashboard-stat__value">{formatCurrency(summary.totalAmount)}</strong>
          <span className="piloto-dashboard-stat__hint">{summary.salesCount} venta(s)</span>
        </div>
        <div className="piloto-dashboard-stat piloto-dashboard-stat--profit">
          <span className="piloto-dashboard-stat__label">Ganancia ({Math.round(summary.profitMarginRatio * 100)}%)</span>
          <strong className="piloto-dashboard-stat__value">{formatCurrency(summary.profitAmount)}</strong>
          <span className="piloto-dashboard-stat__hint">Estimada sobre las ventas</span>
        </div>
      </div>

      {(() => {
        // La numeracion "Venta #1, #2..." va en orden cronologico (la
        // que ya trae summary.sales), pero para MOSTRAR se invierte --
        // la mas reciente primero, igual que en Joker -- asi el recorte
        // de 5 muestra lo que acaba de pasar, no lo mas viejo del dia.
        const recentFirst = [...summary.sales].reverse();
        const hasHiddenMovements = recentFirst.length > MOVEMENTS_PREVIEW_COUNT;
        const visibleSales = showAllMovements ? recentFirst : recentFirst.slice(0, MOVEMENTS_PREVIEW_COUNT);

        return (
          <>
            <div className="piloto-dashboard-section-header">
              <h2 className="piloto-dashboard-section-title">Movimientos</h2>
              {hasHiddenMovements ? (
                <button type="button" className="piloto-dashboard-toggle-btn" onClick={() => setShowAllMovements((current) => !current)}>
                  {showAllMovements ? "Ver menos" : "Ver todos"}
                </button>
              ) : null}
            </div>

            {visibleSales.length ? (
              <ul className="piloto-dashboard-movements">
                {visibleSales.map((sale) => (
                  <li key={sale.id} className="piloto-dashboard-movement">
                    <div className="piloto-dashboard-movement__header">
                      <strong>Venta #{sale.displayNumber}</strong>
                      <span className="piloto-dashboard-movement__time">{formatTime(sale.createdAt)}</span>
                      <strong className="piloto-dashboard-movement__total">{formatCurrency(sale.totalAmount)}</strong>
                    </div>
                    <p className="piloto-dashboard-movement__items">
                      {sale.items.map((item) => (item.quantity > 1 ? `${item.quantity}x ${item.name}` : item.name)).join(", ")}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <section className="piloto-empty-state">
                <p>Todavia no hay ventas hoy.</p>
              </section>
            )}
          </>
        );
      })()}
    </div>
  );
}
