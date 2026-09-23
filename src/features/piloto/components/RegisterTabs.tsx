import type { PilotoRegisterId } from "../hooks/usePilotoCart";

type RegisterSummary = {
  id: PilotoRegisterId;
  count: number;
};

type RegisterTabsProps = {
  registers: RegisterSummary[];
  activeRegisterId: PilotoRegisterId;
  onSelect: (registerId: PilotoRegisterId) => void;
};

// Pestanas "Caja 1 / Caja 2" (22/09/2026, pedido explicito): arriba del
// input de escaneo, centradas, cada una con su cantidad de productos en
// una insignia roja (igual que un contador de carrito). Solo cambian cual
// caja esta activa -- el carrito de cada una vive en usePilotoCart.
export function RegisterTabs({ registers, activeRegisterId, onSelect }: RegisterTabsProps) {
  if (registers.length < 2) return null;

  return (
    <div className="piloto-register-tabs" role="tablist" aria-label="Cajas">
      {registers.map((register) => (
        <button
          key={register.id}
          type="button"
          role="tab"
          aria-selected={register.id === activeRegisterId}
          className={register.id === activeRegisterId ? "piloto-register-tab is-active" : "piloto-register-tab"}
          onClick={() => onSelect(register.id)}
        >
          Caja {register.id}
          {register.count > 0 ? <span className="piloto-register-tab-badge">{register.count}</span> : null}
        </button>
      ))}
    </div>
  );
}
