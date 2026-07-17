import { API_BASE_URL } from "../../shared/config/api";
import type { PilotoProduct } from "./piloto.types";

type ProductResponse = {
  item: PilotoProduct;
};

function normalizeBarcode(barcode: string) {
  return barcode.trim().replace(/\s+/g, "");
}

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("Producto no encontrado.");
    }

    const fallbackText = await response.text().catch(() => "");
    throw new Error(fallbackText || `HTTP ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function findProductByBarcode(barcode: string) {
  const normalizedBarcode = normalizeBarcode(barcode);
  const response = await fetch(`${API_BASE_URL}/piloto/products/barcode/${encodeURIComponent(normalizedBarcode)}`);
  return readJson<ProductResponse>(response);
}
