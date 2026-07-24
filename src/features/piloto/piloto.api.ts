import { API_BASE_URL } from "../../shared/config/api";
import type { CartItem, PilotoPaymentMethod, PilotoProduct, PilotoSale } from "./piloto.types";

type ProductResponse = {
  item: PilotoProduct;
};

type SaleResponse = {
  item: PilotoSale;
};

export function normalizeBarcode(barcode: string) {
  return barcode.trim().replace(/\s+/g, "");
}

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("Producto no encontrado.");
    }

    const fallbackText = await response.text().catch(() => "");
    let parsedMessage: string | undefined;
    try {
      const parsed = JSON.parse(fallbackText) as { message?: string | string[] };
      parsedMessage = Array.isArray(parsed.message) ? parsed.message[0] : parsed.message;
    } catch {
      // El cuerpo no era JSON, se usa el texto crudo como fallback.
    }
    throw new Error(parsedMessage || fallbackText || `HTTP ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function findProductByBarcode(barcode: string): Promise<ProductResponse> {
  const normalizedBarcode = normalizeBarcode(barcode);

  const response = await fetch(`${API_BASE_URL}/piloto/products/barcode/${encodeURIComponent(normalizedBarcode)}`, {
    cache: "no-store"
  });
  return await readJson<ProductResponse>(response);
}

export async function createProduct(barcode: string, name: string, price: number): Promise<ProductResponse> {
  const response = await fetch(`${API_BASE_URL}/piloto/products`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ barcode: normalizeBarcode(barcode), name, price })
  });

  return await readJson<ProductResponse>(response);
}

export async function updateProduct(productId: number, name: string, price: number): Promise<ProductResponse> {
  const response = await fetch(`${API_BASE_URL}/piloto/products/${productId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ name, price })
  });

  return await readJson<ProductResponse>(response);
}

export async function createSale(items: CartItem[], paymentMethod: PilotoPaymentMethod) {
  const response = await fetch(`${API_BASE_URL}/piloto/sales`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      paymentMethod,
      items: items.map((item) => ({
        // Los ids negativos son lineas manuales locales (sin codigo, nunca guardadas
        // como producto real): el backend los recibe sin productId.
        productId: item.productId > 0 ? item.productId : null,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        imageUrl: item.imageUrl
      }))
    })
  });

  return readJson<SaleResponse>(response);
}
