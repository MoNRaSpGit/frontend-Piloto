import { useEffect, useRef, type FormEvent } from "react";

type ScannerInputProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (barcode: string) => void;
  isLoading: boolean;
};

export function ScannerInput({ value, onChange, onSubmit, isLoading }: ScannerInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
  }

  return (
    <form className="piloto-scanner-form" onSubmit={handleSubmit}>
      <input
        ref={inputRef}
        className="piloto-scanner-input"
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="Escanear o escribir codigo de barras"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <button type="submit" className="piloto-scanner-submit" disabled={isLoading || !value.trim()}>
        {isLoading ? "Buscando..." : "Buscar"}
      </button>
    </form>
  );
}
