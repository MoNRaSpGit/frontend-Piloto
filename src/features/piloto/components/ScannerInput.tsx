import { useEffect, useRef, type FormEvent } from "react";

type ScannerInputProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (barcode: string) => void;
  isLoading: boolean;
  error: string;
};

export function ScannerInput({ value, onChange, onSubmit, isLoading, error }: ScannerInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // A laser scanner just types into whatever has focus and sends Enter - refocus
  // after every lookup so the next scan lands in the field without touching the mouse.
  useEffect(() => {
    if (!isLoading) {
      inputRef.current?.focus();
    }
  }, [isLoading]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
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
