import { useEffect, useRef } from "react";

// ESC como cancelador universal (22/09/2026, pedido explicito): en
// cualquier modal/proceso que tenga un boton Cancelar/Cerrar, ESC hace
// exactamente lo mismo que ese boton -- nunca confirma ni guarda nada.
// `isActive` deja el listener afuera cuando el modal esta cerrado o
// mientras hay un guardado en curso (mismo criterio que ya usa cada
// modal para deshabilitar su propio boton Cancelar durante el guardado:
// no se cancela una operacion que ya esta en vuelo).
export function useEscapeToCancel(isActive: boolean, onCancel: () => void) {
  // Siempre llama a la ultima version de onCancel (igual que
  // latestConfirmRef en ScannerCheckout.tsx, para el Enter): si quedara
  // guardada la de cuando se monto el efecto, podria cancelar con datos
  // viejos si el padre le paso una funcion nueva mientras tanto.
  const latestOnCancelRef = useRef(onCancel);
  useEffect(() => {
    latestOnCancelRef.current = onCancel;
  });

  useEffect(() => {
    if (!isActive) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      latestOnCancelRef.current();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isActive]);
}
