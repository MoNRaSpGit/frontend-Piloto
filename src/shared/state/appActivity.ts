// Actividad de la app (22/09/2026, pedido explicito): para que
// AppUpdateNotice sepa si es seguro actualizar solo, sin interrumpir una
// venta en curso. Vive fuera de React, en un modulo simple: AppUpdateNotice
// y PilotoHomePage son hermanos en el arbol (ver main.tsx), no padre-hijo,
// asi que esto evita meter un Context o reestructurar lo que ya existe.
//
// "Inactiva" (pedido explicito) = TODO esto a la vez:
//   - no hay productos cargados en ninguna caja (nada por cobrar)
//   - no hay ningun modal/proceso abierto (cobro, alta rapida, manual, edicion)
//   - no hubo ninguna interaccion del usuario en los ultimos segundos
// Si CUALQUIERA de esas tres no se cumple, se considera "en uso".
// 45 s (06/11/2026): sin cartel de por medio, la recarga no tiene que caer
// entre dos clientes seguidos.
const IDLE_INTERACTION_THRESHOLD_MS = 45_000;

let lastInteractionAt = Date.now();
let isStructurallyBusy = false;

function markInteraction() {
  lastInteractionAt = Date.now();
}

if (typeof window !== "undefined") {
  const interactionEvents: Array<keyof WindowEventMap> = ["keydown", "mousedown", "touchstart", "wheel"];
  for (const eventName of interactionEvents) {
    window.addEventListener(eventName, markInteraction, { passive: true });
  }
}

// Lo llama PilotoHomePage cada vez que cambia si hay productos cargados o
// algun modal/proceso abierto (ver el efecto en PilotoHomePage.tsx).
export function setAppBusy(busy: boolean) {
  isStructurallyBusy = busy;
  if (busy) markInteraction();
}

// Lo consulta AppUpdateNotice cada vez que detecta una version nueva.
export function isAppIdle(): boolean {
  if (isStructurallyBusy) return false;
  return Date.now() - lastInteractionAt >= IDLE_INTERACTION_THRESHOLD_MS;
}

// Recarga por actualizacion (06/11/2026, pedido explicito): "que siga todo
// como esta". El modo Pro y la caja elegida NO se guardan nunca (a proposito:
// cerrar y reabrir la app vuelve a Basico), pero una recarga que hace la app
// SOLA para actualizarse no tiene que tocarlos. Justo antes de recargar por
// actualizacion se anota el estado en sessionStorage (solo sobrevive a esa
// recarga, en esa pestana) y al arrancar se lee una unica vez y se borra.
// La pestana activa (tablet / productos / clientes...) ya se guarda aparte
// en localStorage, ver PilotoHomePage.tsx.
type UiSnapshot = { mode: "basic" | "pro"; registerId: number };
const UI_RESTORE_KEY = "piloto-ui-after-update";
let currentUi: UiSnapshot = { mode: "basic", registerId: 1 };

export function reportUiState(partial: Partial<UiSnapshot>) {
  currentUi = { ...currentUi, ...partial };
}

export function saveUiForUpdateReload() {
  try {
    window.sessionStorage.setItem(UI_RESTORE_KEY, JSON.stringify(currentUi));
  } catch {
    // Sin storage: se recarga igual, vuelve a Basico como siempre.
  }
}

function readUiAfterUpdate(): UiSnapshot | null {
  try {
    const raw = window.sessionStorage.getItem(UI_RESTORE_KEY);
    window.sessionStorage.removeItem(UI_RESTORE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<UiSnapshot>;
    return {
      mode: parsed.mode === "pro" ? "pro" : "basic",
      registerId: typeof parsed.registerId === "number" ? parsed.registerId : 1
    };
  } catch {
    return null;
  }
}

// Se lee una sola vez al cargar el modulo (antes de que arranque React).
export const uiRestoredAfterUpdate: UiSnapshot | null = typeof window !== "undefined" ? readUiAfterUpdate() : null;
