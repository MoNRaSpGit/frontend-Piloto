import { useEffect, useRef, useState, type FormEvent } from "react";

type ScannerInputProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (barcode: string) => void;
  onEmptyEnter: () => void;
  isLoading: boolean;
  error: string;
  focusSignal: number;
};

// Algunos lectores, al reconectarse mal, mandan el mismo digito repetido
// muchas veces en la primera lectura (ej. "77777777777777") en vez del
// codigo real. Sin este filtro, esa lectura basura termina abriendo el
// modal de "producto no encontrado" invitando a crear un producto con ese
// "codigo" - facil de confirmar sin querer si se esta escaneando rapido.
const REPEATED_DIGIT_PATTERN = /^(\d)\1{5,}$/;

function isLikelyInvalidScan(value: string) {
  return REPEATED_DIGIT_PATTERN.test(value);
}

export function ScannerInput({ value, onChange, onSubmit, onEmptyEnter, isLoading, error, focusSignal }: ScannerInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [invalidScanWarning, setInvalidScanWarning] = useState("");

  // Un lector laser tipea sobre lo que este enfocado y manda Enter - reenfocar
  // despues de cada busqueda para que el proximo escaneo caiga en el campo sin tocar el mouse.
  useEffect(() => {
    if (!isLoading) {
      inputRef.current?.focus();
    }
  }, [isLoading, focusSignal]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) {
      // Enter con el input vacio = "camino feliz": ir directo a confirmar el cobro.
      onEmptyEnter();
      return;
    }

    if (isLikelyInvalidScan(trimmed)) {
      setInvalidScanWarning("Lectura invalida (lector desincronizado). Volve a escanear.");
      onChange("");
      return;
    }

    setInvalidScanWarning("");
    onSubmit(trimmed);
  }

  return (
    <div className="piloto-scanner-dominant">
      <form onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          className="piloto-scanner-input"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="Escanear aqui"
          value={value}
          onChange={(event) => {
            setInvalidScanWarning("");
            onChange(event.target.value);
          }}
          disabled={isLoading}
          autoFocus
        />
      </form>
      {isLoading ? <p className="piloto-scanner-status">Buscando producto...</p> : null}
      {invalidScanWarning ? <p className="piloto-scanner-status piloto-scanner-status--error">{invalidScanWarning}</p> : null}
      {error ? <p className="piloto-scanner-status piloto-scanner-status--error">{error}</p> : null}
    </div>
  );
}
