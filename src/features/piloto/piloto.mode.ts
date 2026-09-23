import { useEffect, useState } from "react";

// Modo Basico / Pro (23/09/2026, pedido explicito): "un solo proyecto y
// una sola base de codigo... la idea es tener una sola aplicacion y
// controlar mediante una configuracion que funcionalidades estan
// habilitadas". A proposito NO es un sistema de permisos ni un registro
// de features: cada funcionalidad Pro se controla con un simple
// `mode === "pro"` en el lugar donde ya vive esa funcionalidad (ver
// PilotoHomePage.tsx: las cajas y la impresora). Si en el futuro esto
// crece mucho, ahi se justifica algo mas formal -- por ahora alcanza y
// sobra con esto.
//
// Basico = version original de Piloto (escaner, producto manual, venta).
// Pro = Basico + las funcionalidades nuevas (cajas, impresora, lo que se
// vaya agregando).
export type PilotoMode = "basic" | "pro";

const STORAGE_KEY = "piloto.mode";
// Pedido explicito: un dispositivo nuevo (sin nada guardado todavia)
// arranca en Basico -- Pro se activa a mano.
const DEFAULT_MODE: PilotoMode = "basic";

function readStoredMode(): PilotoMode {
  if (typeof window === "undefined") return DEFAULT_MODE;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "pro" ? "pro" : DEFAULT_MODE;
}

export function usePilotoMode() {
  const [mode, setModeState] = useState<PilotoMode>(readStoredMode);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, mode);
  }, [mode]);

  function setMode(nextMode: PilotoMode) {
    setModeState(nextMode);
  }

  return { mode, setMode, isPro: mode === "pro" };
}
