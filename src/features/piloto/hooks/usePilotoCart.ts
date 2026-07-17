import { useMemo, useRef, useState } from "react";
import type { CartItem, PilotoProduct } from "../piloto.types";

export function usePilotoCart() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [lastScannedProductId, setLastScannedProductId] = useState<number | null>(null);
  const manualIdsByBarcodeRef = useRef(new Map<string, number>());
  const nextManualIdRef = useRef(-1);

  function addLine(productId: number, line: Omit<CartItem, "productId" | "quantity">) {
    setLastScannedProductId(productId);
    setCartItems((current) => {
      const existing = current.find((item) => item.productId === productId);
      if (existing) {
        const updated: CartItem = { ...existing, quantity: existing.quantity + 1 };
        return [updated, ...current.filter((item) => item.productId !== productId)];
      }

      const nextItem: CartItem = { productId, quantity: 1, ...line };
      return [nextItem, ...current];
    });
  }

  function addProduct(product: PilotoProduct) {
    addLine(product.id, {
      catalogProductId: product.id,
      name: product.name,
      price: product.price,
      imageUrl: product.imageUrl
    });
  }

  function addManualItem(barcode: string, name: string, price: number) {
    let manualId = manualIdsByBarcodeRef.current.get(barcode);
    if (manualId === undefined) {
      manualId = nextManualIdRef.current;
      nextManualIdRef.current -= 1;
      manualIdsByBarcodeRef.current.set(barcode, manualId);
    }

    addLine(manualId, {
      catalogProductId: null,
      name,
      price,
      imageUrl: null
    });
  }

  function addOne(productId: number) {
    setLastScannedProductId(productId);
    setCartItems((current) => current.map((item) => (item.productId === productId ? { ...item, quantity: item.quantity + 1 } : item)));
  }

  function removeOne(productId: number) {
    setCartItems((current) =>
      current
        .map((item) => (item.productId === productId ? { ...item, quantity: item.quantity - 1 } : item))
        .filter((item) => item.quantity > 0)
    );
  }

  function updateItem(productId: number, changes: { name: string; price: number }) {
    setCartItems((current) =>
      current.map((item) => (item.productId === productId ? { ...item, name: changes.name, price: changes.price } : item))
    );
  }

  function clearCart() {
    setCartItems([]);
    setLastScannedProductId(null);
  }

  const total = useMemo(() => cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0), [cartItems]);

  return { cartItems, lastScannedProductId, addProduct, addManualItem, addOne, removeOne, updateItem, clearCart, total };
}
