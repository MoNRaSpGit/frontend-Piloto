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

// "Panel de control" -- Modo Pro (24/09/2026): ventas, ganancia (30% de
// las ventas) y el detalle de cada venta del dia ("Movimientos").
export type PilotoSaleMovementItem = {
  name: string;
  quantity: number;
  // Pedido explicito (24/09/2026): "hacerle click a la venta que muestre
  // en detalle los productos, uno arriba del otro, con el precio".
  unitPrice: number;
  lineTotal: number;
};

export type PilotoSaleMovement = {
  id: number;
  displayNumber: number;
  createdAt: string;
  totalAmount: number;
  paymentMethod: PilotoPaymentMethod;
  items: PilotoSaleMovementItem[];
};

export type PilotoSalesSummary = {
  date: string;
  salesCount: number;
  totalAmount: number;
  profitAmount: number;
  profitMarginRatio: number;
  sales: PilotoSaleMovement[];
};

// Clientes / cuenta corriente (06/10/2026): venta a credito ligada a un
// cliente. El saldo es siempre la suma de sus boletas (account entries)
// abiertas -- no hay un numero de saldo guardado aparte.
export type PilotoClient = {
  id: number;
  name: string;
  phone: string | null;
  address: string | null;
  createdAt: string;
};

export type PilotoAccountEntryItem = {
  productName: string;
  quantity: number;
  unitPrice: number;
};

export type PilotoAccountEntry = {
  id: number;
  clientId: number;
  saleId: number | null;
  total: number;
  items: PilotoAccountEntryItem[];
  createdAt: string;
};
