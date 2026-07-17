import { API_BASE_URL } from "../../shared/config/api";
import { getCachedLookup, setCachedLookup } from "./piloto.lookupCache";
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
  const cacheKey = `${API_BASE_URL}::${normalizedBarcode}`;

  const cachedProduct = getCachedLookup(cacheKey);
  if (cachedProduct) {
    return { item: cachedProduct };
  }

  const response = await fetch(`${API_BASE_URL}/piloto/products/barcode/${encodeURIComponent(normalizedBarcode)}`, {
    cache: "no-store"
  });
  const result = await readJson<ProductResponse>(response);
  setCachedLookup(cacheKey, result.item);
  return result;
}

export async function createProduct(barcode: string, name: string, price: number): Promise<ProductResponse> {
  const response = await fetch(`${API_BASE_URL}/piloto/products`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ barcode: normalizeBarcode(barcode), name, price })
  });

  const result = await readJson<ProductResponse>(response);
  setCachedLookup(`${API_BASE_URL}::${normalizeBarcode(barcode)}`, result.item);
  return result;
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
        productId: item.productId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        imageUrl: item.imageUrl
      }))
    })
  });

  return readJson<SaleResponse>(response);
}
