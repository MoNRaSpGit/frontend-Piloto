import { buildRawTicketLines, type SaleTicket } from "./piloto.ticketFormat";

export type { SaleTicket };

const COMBINING_DIACRITICS_REGEX = new RegExp("[\\u0300-\\u036f]", "g");

// RawBT manda los bytes tal cual a la impresora (sin pasar por un encoding
// como CP437 en QZ), asi que sacamos acentos para no mandar bytes fuera del
// rango que btoa() puede manejar de forma segura.
function stripAccents(value: string) {
  return value.normalize("NFD").replace(COMBINING_DIACRITICS_REGEX, "");
}

function isRawBtAvailable() {
  return typeof window !== "undefined";
}

export async function printSaleTicketByRawBt(ticket: SaleTicket) {
  if (!isRawBtAvailable()) {
    throw new Error("RawBT no esta disponible en este entorno.");
  }

  const sanitizedTicket: SaleTicket = {
    ...ticket,
    storeName: ticket.storeName ? stripAccents(ticket.storeName) : ticket.storeName,
    items: ticket.items.map((item) => ({ ...item, name: stripAccents(item.name) }))
  };

  const lines = buildRawTicketLines(sanitizedTicket, { drawerKick: true });
  const rawData = lines.join("");
  const base64Data = window.btoa(rawData);

  // RawBT (app de Android) queda registrada como manejadora del esquema
  // "rawbt:" y recibe el ticket + el pulso del cajon en el mismo trabajo,
  // conectada por USB a la impresora. No hay forma de confirmar el
  // resultado desde JS: el intent es "dispara y listo".
  window.location.href = `rawbt:base64,${base64Data}`;
}
