import { useState } from "react";

// Modo Basico / Pro (23/09/2026, pedido explicito): "un solo proyecto y
// una sola base de codigo... la idea es tener una sola aplicacion y
// controlar mediante una configuracion que funcionalidades estan
// habilitadas". A proposito NO es un sistema de permisos ni un registro
// de features: cada funcionalidad Pro se controla con un simple
// `mode === "pro"` en el lugar donde ya vive esa funcionalidad (ver
// PilotoHomePage.tsx: las cajas y la impresora).
//
// Basico = version original de Piloto (escaner, producto manual, venta).
// Pro = Basico + las funcionalidades nuevas (cajas, impresora, lo que se
// vaya agregando).
export type PilotoMode = "basic" | "pro";

// Pedido explicito (25/09/2026): el programa SIEMPRE arranca en Basico,
// cada vez que se cierra y se vuelve a abrir. Pro se activa a mano (3
// clics en "Piloto") y vive solo mientras la app esta abierta: el modo
// NO se guarda en ningun lado (ni localStorage ni sessionStorage, que el
// navegador puede restaurar al reabrir), asi que recargar o reabrir
// siempre vuelve a Basico.
const LEGACY_STORAGE_KEY = "piloto.mode";

// Borra el valor viejo que guardaba versiones anteriores, para que no
// quede basura de un dispositivo que se dejo en Pro.
try {
  window.localStorage.removeItem(LEGACY_STORAGE_KEY);
} catch {
  // Sin acceso a storage no pasa nada: el modo nunca se lee de ahi.
}

export function usePilotoMode() {
  const [mode, setMode] = useState<PilotoMode>("basic");

  return { mode, setMode, isPro: mode === "pro" };
}
