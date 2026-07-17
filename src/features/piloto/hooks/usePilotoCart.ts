import { useMemo, useState } from "react";
import type { CartItem, PilotoProduct } from "../piloto.types";

export function usePilotoCart() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [lastScannedProductId, setLastScannedProductId] = useState<number | null>(null);

  function addProduct(product: PilotoProduct) {
    setLastScannedProductId(product.id);
    setCartItems((current) => {
      const existing = current.find((item) => item.productId === product.id);
      if (existing) {
        const updated: CartItem = { ...existing, quantity: existing.quantity + 1 };
        return [updated, ...current.filter((item) => item.productId !== product.id)];
      }

      const nextItem: CartItem = {
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: 1,
        imageUrl: product.imageUrl
      };
      return [nextItem, ...current];
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

  function clearCart() {
    setCartItems([]);
    setLastScannedProductId(null);
  }

  const total = useMemo(() => cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0), [cartItems]);

  return { cartItems, lastScannedProductId, addProduct, addOne, removeOne, clearCart, total };
}
