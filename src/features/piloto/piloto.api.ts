import { API_BASE_URL } from "../../shared/config/api";
import type { CartItem, PilotoPaymentMethod, PilotoPriceCategory, PilotoPriceEntry, PilotoProduct, PilotoSale } from "./piloto.types";

// El backend no manda la imagen en el JSON del producto (se guarda aparte,
// en binario, para no arrastrar base64 gigante en cada busqueda). Solo
// manda si tiene o no, y se arma la url completa aca.
type RawPilotoProduct = Omit<PilotoProduct, "imageUrl"> & { hasImage: boolean };

type RawProductResponse = {
  item: RawPilotoProduct;
};

type ProductResponse = {
  item: PilotoProduct;
};

function buildProductImageUrl(productId: number) {
  return `${API_BASE_URL}/piloto/products/${productId}/image`;
}

function mapProduct(raw: RawPilotoProduct): PilotoProduct {
  const { hasImage, ...rest } = raw;
  return { ...rest, imageUrl: hasImage ? buildProductImageUrl(raw.id) : null };
}

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
  const raw = await readJson<RawProductResponse>(response);
  return { item: mapProduct(raw.item) };
}

export async function createProduct(barcode: string, name: string, price: number): Promise<ProductResponse> {
  const response = await fetch(`${API_BASE_URL}/piloto/products`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ barcode: normalizeBarcode(barcode), name, price })
  });

  const raw = await readJson<RawProductResponse>(response);
  return { item: mapProduct(raw.item) };
}

export async function updateProduct(productId: number, name: string, price: number): Promise<ProductResponse> {
  const response = await fetch(`${API_BASE_URL}/piloto/products/${productId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ name, price })
  });

  const raw = await readJson<RawProductResponse>(response);
  return { item: mapProduct(raw.item) };
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

// "Precios" -- Modo Pro (23/09/2026): lista de precios por categoria,
// independiente de los productos del escaner (de arriba en este archivo).
type PriceEntryListResponse = { items: PilotoPriceEntry[] };
type PriceEntryResponse = { item: PilotoPriceEntry };

export async function listPriceEntries(): Promise<PriceEntryListResponse> {
  const response = await fetch(`${API_BASE_URL}/piloto/price-entries`, { cache: "no-store" });
  return readJson<PriceEntryListResponse>(response);
}

export async function createPriceEntry(
  category: PilotoPriceCategory,
  name: string,
  price: number
): Promise<PriceEntryResponse> {
  const response = await fetch(`${API_BASE_URL}/piloto/price-entries`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ category, name, price })
  });
  return readJson<PriceEntryResponse>(response);
}

export async function updatePriceEntry(id: number, name: string, price: number): Promise<PriceEntryResponse> {
  const response = await fetch(`${API_BASE_URL}/piloto/price-entries/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, price })
  });
  return readJson<PriceEntryResponse>(response);
}

export async function deletePriceEntry(id: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/piloto/price-entries/${id}`, { method: "DELETE" });
  await readJson<{ ok: true }>(response);
}
