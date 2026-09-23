import { useMemo, useRef, useState } from "react";
import type { CartItem, PilotoProduct } from "../piloto.types";

// Cajas independientes (22/09/2026, pedido explicito): "no crear dos
// pantallas diferentes ni duplicar la logica de productos... dos
// estados/carritos independientes dentro de la misma pantalla". Por eso
// esto sigue siendo UN SOLO hook con una sola implementacion de cada
// accion (addProduct, addOne, etc.) -- lo unico que cambia es que cada
// accion opera sobre el carrito de la caja ACTIVA en vez de un carrito
// unico. El resto de la app (PilotoHomePage, ScannerCart, etc.) sigue
// viendo la misma forma de siempre (cartItems, lastScannedProductId,
// total...), sin enterarse de que por dentro hay mas de una caja.
//
// "Facil agregar mas cajas": son las que haya en DEFAULT_REGISTER_IDS,
// nada mas -- agregar un 3 al array alcanza para tener "Caja 3".
export type PilotoRegisterId = number;

export const DEFAULT_PILOTO_REGISTER_IDS: PilotoRegisterId[] = [1, 2];

type RegisterState = {
  cartItems: CartItem[];
  lastScannedProductId: number | null;
};

type RegisterSummary = {
  id: PilotoRegisterId;
  count: number;
};

function createEmptyRegisterState(): RegisterState {
  return { cartItems: [], lastScannedProductId: null };
}

export function usePilotoCart(registerIds: PilotoRegisterId[] = DEFAULT_PILOTO_REGISTER_IDS) {
  const [activeRegisterId, setActiveRegisterId] = useState<PilotoRegisterId>(registerIds[0]);
  const [registers, setRegisters] = useState<Record<PilotoRegisterId, RegisterState>>(() =>
    Object.fromEntries(registerIds.map((id) => [id, createEmptyRegisterState()]))
  );
  // Ids manuales negativos: UN SOLO contador global (no uno por caja), para
  // que nunca se repitan aunque dos cajas tengan items manuales cargados
  // al mismo tiempo.
  const nextManualIdRef = useRef(-1);

  const activeRegister = registers[activeRegisterId];
  const cartItems = activeRegister.cartItems;
  const lastScannedProductId = activeRegister.lastScannedProductId;

  function updateActiveRegister(updater: (state: RegisterState) => RegisterState) {
    setRegisters((current) => ({ ...current, [activeRegisterId]: updater(current[activeRegisterId]) }));
  }

  function addProduct(product: PilotoProduct) {
    updateActiveRegister((state) => {
      const existing = state.cartItems.find((item) => item.productId === product.id);
      const nextCartItems = existing
        ? [{ ...existing, quantity: existing.quantity + 1 }, ...state.cartItems.filter((item) => item.productId !== product.id)]
        : [
            { productId: product.id, name: product.name, price: product.price, quantity: 1, imageUrl: product.imageUrl },
            ...state.cartItems
          ];
      return { cartItems: nextCartItems, lastScannedProductId: product.id };
    });
  }

  // Producto sin codigo (ej: fruta/verdura suelta): siempre crea una linea nueva,
  // nunca suma cantidad a una existente, y jamas se guarda como producto real.
  // `name` (23/09/2026, pedido explicito): los 4 botones de categoria de
  // Modo Pro reusan este mismo metodo, solo cambiando el nombre que queda
  // en la venta -- "Producto Manual" sigue siendo el valor por defecto,
  // asi que el boton original no cambia en nada.
  function addManualItem(price: number, name: string = "Producto Manual") {
    const productId = nextManualIdRef.current;
    nextManualIdRef.current -= 1;

    updateActiveRegister((state) => ({
      cartItems: [{ productId, name, price, quantity: 1, imageUrl: null }, ...state.cartItems],
      lastScannedProductId: productId
    }));
  }

  function addOne(productId: number) {
    updateActiveRegister((state) => ({
      cartItems: state.cartItems.map((item) => (item.productId === productId ? { ...item, quantity: item.quantity + 1 } : item)),
      lastScannedProductId: productId
    }));
  }

  function removeOne(productId: number) {
    updateActiveRegister((state) => ({
      ...state,
      cartItems: state.cartItems
        .map((item) => (item.productId === productId ? { ...item, quantity: item.quantity - 1 } : item))
        .filter((item) => item.quantity > 0)
    }));
  }

  function updateItem(productId: number, changes: { name: string; price: number }) {
    updateActiveRegister((state) => ({
      ...state,
      cartItems: state.cartItems.map((item) => (item.productId === productId ? { ...item, name: changes.name, price: changes.price } : item))
    }));
  }

  // Solo vacia la caja ACTIVA (pedido explicito: "cobro y confirmo Caja 1,
  // Caja 1 queda vacia, Caja 2 sigue teniendo sus productos intactos").
  function clearCart() {
    updateActiveRegister(() => createEmptyRegisterState());
  }

  const total = useMemo(() => cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0), [cartItems]);

  const registerSummaries = useMemo<RegisterSummary[]>(
    () => registerIds.map((id) => ({ id, count: registers[id].cartItems.reduce((sum, item) => sum + item.quantity, 0) })),
    [registerIds, registers]
  );

  return {
    cartItems,
    lastScannedProductId,
    addProduct,
    addManualItem,
    addOne,
    removeOne,
    updateItem,
    clearCart,
    total,
    activeRegisterId,
    setActiveRegisterId,
    registerSummaries
  };
}
