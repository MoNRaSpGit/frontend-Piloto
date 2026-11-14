import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";

type ScannerInputProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (barcode: string) => void;
  onEmptyEnter: () => void;
  isLoading: boolean;
  error: string;
  focusSignal: number;
  // Tablet del fondo (30/10/2026, pedido explicito: "que no abra ningun
  // teclado, esta molestando"): el campo sigue recibiendo lo que tipea el
  // lector, pero la pantalla tactil no despliega el teclado.
  noKeyboard?: boolean;
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

const INVALID_SCAN_MESSAGE = "Lectura invalida (lector desincronizado). Volve a escanear.";

export function ScannerInput({ value, onChange, onSubmit, onEmptyEnter, isLoading, error, focusSignal, noKeyboard = false }: ScannerInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [invalidScanWarning, setInvalidScanWarning] = useState("");

  // Un lector laser tipea sobre lo que este enfocado y manda Enter - reenfocar
  // despues de cada busqueda para que el proximo escaneo caiga en el campo sin tocar el mouse.
  useEffect(() => {
    if (!isLoading) {
      inputRef.current?.focus();
    }
  }, [isLoading, focusSignal]);

  // Tecla "pegada" (14/11/2026): si el lector queda trabado mandando un
  // digito, el sistema lo repite sin parar (event.repeat = true) y el campo
  // se llena de "77777777". Un lector bueno NUNCA manda repeticiones de
  // tecla mantenida (cada digito es una pulsacion nueva), asi que se
  // descartan.
  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.repeat && /^d$/.test(event.key)) {
      event.preventDefault();
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) {
      // Enter con el input vacio = "camino feliz": ir directo a confirmar el cobro.
      onEmptyEnter();
      return;
    }

    if (isLikelyInvalidScan(trimmed)) {
      setInvalidScanWarning(INVALID_SCAN_MESSAGE);
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
          inputMode={noKeyboard ? "none" : "numeric"}
          autoComplete="off"
          placeholder="Escanear aqui"
          value={value}
          onKeyDown={handleKeyDown}
          onChange={(event) => {
            const next = event.target.value;
            // Lectura basura (mismo digito 6+ veces): se vacia al instante
            // en vez de dejar crecer la linea de numeros.
            if (isLikelyInvalidScan(next.trim())) {
              setInvalidScanWarning(INVALID_SCAN_MESSAGE);
              onChange("");
              return;
            }
            setInvalidScanWarning("");
            onChange(next);
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
