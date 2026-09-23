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
const IDLE_INTERACTION_THRESHOLD_MS = 15_000;

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
