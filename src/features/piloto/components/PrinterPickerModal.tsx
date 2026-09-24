import { useEffect, useState } from "react";
import { useEscapeToCancel } from "../hooks/useEscapeToCancel";
import { getSelectedPrinterName, listAvailablePrinters, selectPrinterName } from "../services/piloto.qzPrint";

type PrinterPickerModalProps = {
  onClose: () => void;
  onSelected: (printerName: string) => void;
};

// Selector manual de impresora (pedido explicito, 24/09/2026): lista las
// impresoras que ve QZ Tray en esta PC y guarda la elegida, para no
// depender de que el nombre se adivine solo.
export function PrinterPickerModal({ onClose, onSelected }: PrinterPickerModalProps) {
  const [printers, setPrinters] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const selectedName = getSelectedPrinterName();

  useEscapeToCancel(true, onClose);

  useEffect(() => {
    let cancelled = false;
    listAvailablePrinters()
      .then((list) => {
        if (!cancelled) setPrinters(list);
      })
      .catch((error) => {
        if (!cancelled) setLoadError(error instanceof Error ? error.message : "No se pudo consultar QZ Tray.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function handlePick(printerName: string) {
    selectPrinterName(printerName);
    onSelected(printerName);
    onClose();
  }

  return (
    <div className="piloto-modal-overlay" role="dialog" aria-modal="true" aria-label="Seleccionar impresora">
      <div className="piloto-modal-card">
        <div className="piloto-modal-card__header">
          <h2>Seleccionar impresora</h2>
          <button type="button" className="piloto-modal-close" onClick={onClose}>
            Cerrar
          </button>
        </div>

        {isLoading ? <p className="piloto-modal-card__label">Buscando impresoras en QZ Tray...</p> : null}
        {loadError ? (
          <p className="piloto-modal-card__label">
            No se pudo consultar QZ Tray: {loadError}. Revisá que esté abierto (ícono en la bandeja).
          </p>
        ) : null}
        {!isLoading && !loadError && !printers.length ? (
          <p className="piloto-modal-card__label">QZ Tray no encontró ninguna impresora.</p>
        ) : null}

        <div className="piloto-mode-options">
          {printers.map((printerName) => (
            <button
              key={printerName}
              type="button"
              className={printerName === selectedName ? "piloto-mode-option is-active" : "piloto-mode-option"}
              onClick={() => handlePick(printerName)}
            >
              <strong>{printerName}</strong>
              {printerName === selectedName ? <span>Elegida actualmente</span> : null}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
