import { useEscapeToCancel } from "../hooks/useEscapeToCancel";
import type { PilotoMode } from "../piloto.mode";

type PilotoModeModalProps = {
  mode: PilotoMode;
  onSelect: (mode: PilotoMode) => void;
  onClose: () => void;
};

// Selector de modo, oculto (pedido explicito, 23/09/2026): se abre con 3
// clics sobre el titulo "Piloto" (ver PilotoHomePage.tsx). Elegir un modo
// lo aplica al toque y cierra el modal solo -- no hace falta "Confirmar"
// aparte.
export function PilotoModeModal({ mode, onSelect, onClose }: PilotoModeModalProps) {
  useEscapeToCancel(true, onClose);

  return (
    <div className="piloto-modal-overlay" role="dialog" aria-modal="true" aria-label="Elegir modo">
      <div className="piloto-modal-card">
        <div className="piloto-modal-card__header">
          <h2>Modo</h2>
          <button type="button" className="piloto-modal-close" onClick={onClose}>
            Cerrar
          </button>
        </div>

        <div className="piloto-mode-options">
          <button
            type="button"
            className={mode === "basic" ? "piloto-mode-option is-active" : "piloto-mode-option"}
            onClick={() => onSelect("basic")}
          >
            <strong>Modo Básico</strong>
            <span>Escáner, producto manual y venta. Sin cajas ni impresora.</span>
          </button>
          <button
            type="button"
            className={mode === "pro" ? "piloto-mode-option is-active" : "piloto-mode-option"}
            onClick={() => onSelect("pro")}
          >
            <strong>Modo Pro</strong>
            <span>Todo lo del básico, más Caja 1 / Caja 2 e impresora.</span>
          </button>
        </div>
      </div>
    </div>
  );
}
