export type PilotoProductStatus = "active" | "inactive";

export type PilotoProduct = {
  id: number;
  name: string;
  barcode: string;
  price: number;
  stock: number;
  imageUrl: string | null;
  status: PilotoProductStatus;
  createdAt: string;
  updatedAt: string;
};

export type PilotoPaymentMethod = "efectivo" | "tarjeta" | "credito";

export type PilotoSale = {
  id: number;
  totalAmount: number;
  itemsCount: number;
  paymentMethod: PilotoPaymentMethod;
  createdAt: string;
};

export type CartItem = {
  productId: number;
  name: string;
  price: number;
  quantity: number;
  imageUrl: string | null;
};

// "Precios" -- Modo Pro (23/09/2026): lista de precios por categoria,
// independiente de los productos reales del escaner (PilotoProduct).
export type PilotoPriceCategory = "congelados" | "frutas_verduras" | "empanadas" | "otros";

export type PilotoPriceEntry = {
  id: number;
  category: PilotoPriceCategory;
  name: string;
  price: number;
  createdAt: string;
  updatedAt: string;
};
