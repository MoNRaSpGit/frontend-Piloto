import qz from "qz-tray";
import type { CartItem, PilotoPaymentMethod } from "../piloto.types";

export type SaleTicket = {
  externalId: string;
  chargedAtIso: string;
  paymentMethod: PilotoPaymentMethod;
  items: CartItem[];
  total: number;
  storeName?: string;
};

const TICKET_WIDTH = 42;
const FALLBACK_PREFERRED_PRINTER = "ImpRamon";
const PRODUCT_COL = 24;
const QTY_COL = 6;
const SUBTOTAL_COL = 12;

let cachedPrinterName = FALLBACK_PREFERRED_PRINTER;

function money(value: number) {
  return Number(value || 0).toFixed(2);
}

function formatWhen(isoDate?: string) {
  const date = isoDate ? new Date(isoDate) : new Date();
  return date.toLocaleString("es-UY", {
    timeZone: "America/Montevideo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function padLine(left = "", rightValue = "", width = TICKET_WIDTH) {
  const leftText = String(left || "");
  const rightText = String(rightValue || "");
  const free = Math.max(1, width - rightText.length);
  const leftTrimmed = leftText.slice(0, free);
  return `${leftTrimmed}${" ".repeat(Math.max(1, width - leftTrimmed.length - rightText.length))}${rightText}`;
}

function formatCols(product: string, qty: string | number, subtotal: string) {
  const productText = String(product || "").slice(0, PRODUCT_COL).padEnd(PRODUCT_COL, " ");
  const qtyText = String(qty || "").slice(0, QTY_COL).padStart(QTY_COL, " ");
  const subtotalText = String(subtotal || "").slice(0, SUBTOTAL_COL).padStart(SUBTOTAL_COL, " ");
  return `${productText}${qtyText}${subtotalText}`;
}

function divider() {
  return "-".repeat(TICKET_WIDTH);
}

function paymentMethodLabel(method: PilotoPaymentMethod) {
  if (method === "tarjeta") return "Tarjeta";
  if (method === "credito") return "Credito";
  return "Efectivo";
}

function pickPrinterName(printers: string[] = []) {
  const list = Array.isArray(printers) ? printers : [];
  const physical = list.filter((name) => !/pdf|xps|onenote|fax|microsoft print to pdf/i.test(String(name || "")));
  if (!physical.length) {
    return "";
  }

  const preferred = physical.find((name) => /xprinter|xp-|pos|thermal|receipt/i.test(String(name || "")));
  return preferred || physical[0];
}

async function ensureQzConnected() {
  if (!qz.websocket.isActive()) {
    await qz.websocket.connect();
  }
}

function buildRawTicket(ticket: SaleTicket) {
  const items = Array.isArray(ticket.items) ? ticket.items : [];
  const lines: string[] = [];

  lines.push("\x1B\x40");
  lines.push("\x1B\x61\x01");
  lines.push(`${String(ticket.storeName || "Piloto")}\n`);
  lines.push(`Ticket: ${ticket.externalId || "-"}\n`);
  lines.push(`Fecha: ${formatWhen(ticket.chargedAtIso)}\n`);
  lines.push(`Pago: ${paymentMethodLabel(ticket.paymentMethod)}\n`);
  lines.push("\x1B\x61\x00");
  lines.push(`${divider()}\n`);
  lines.push(`${formatCols("Produc.", "Cant.", "Subtotal")}\n`);
  lines.push(`${divider()}\n`);

  items.forEach((item) => {
    const qty = Number(item.quantity || 1);
    const subtotal = qty * Number(item.price || 0);
    lines.push(`${formatCols(item.name, qty, `$${money(subtotal)}`)}\n`);
  });

  lines.push(`${divider()}\n`);
  lines.push(`${padLine("TOTAL", `$${money(ticket.total)}`)}\n`);
  lines.push(`${divider()}\n`);
  lines.push("\x1B\x61\x01");
  lines.push("Gracias por su compra\n");
  lines.push("\n\n\n");
  lines.push("\x1D\x56\x41\x00");

  return lines;
}

export async function printSaleTicketByQz(ticket: SaleTicket) {
  await ensureQzConnected();
  const data = buildRawTicket(ticket);

  const attemptPrinter = async (printerName: string) => {
    const config = qz.configs.create(printerName, { encoding: "CP437" });
    await qz.print(config, data);
    cachedPrinterName = printerName;
    return { printerName };
  };

  if (cachedPrinterName) {
    try {
      return await attemptPrinter(cachedPrinterName);
    } catch {
      // Si falla, intentar descubrimiento una sola vez.
    }
  }

  const printers = await qz.printers.find();
  const printerName = pickPrinterName(printers);
  if (!printerName) {
    const detected = Array.isArray(printers) && printers.length ? printers.join(", ") : "ninguna";
    throw new Error(`QZ no encontro una impresora termica (Xprinter/POS). Detectadas: ${detected}`);
  }

  return attemptPrinter(printerName);
}
