import { useEffect, useRef, type FormEvent } from "react";

type ScannerInputProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (barcode: string) => void;
  onEmptyEnter: () => void;
  isLoading: boolean;
  error: string;
  focusSignal: number;
};

export function ScannerInput({ value, onChange, onSubmit, onEmptyEnter, isLoading, error, focusSignal }: ScannerInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

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
          onChange={(event) => onChange(event.target.value)}
          disabled={isLoading}
          autoFocus
        />
      </form>
      {isLoading ? <p className="piloto-scanner-status">Buscando producto...</p> : null}
      {error ? <p className="piloto-scanner-status piloto-scanner-status--error">{error}</p> : null}
    </div>
  );
}
