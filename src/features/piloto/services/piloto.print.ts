import { printSaleTicketByQz } from "./piloto.qzPrint";
import { printSaleTicketByRawBt } from "./piloto.rawbtPrint";
import type { SaleTicket } from "./piloto.ticketFormat";

export type { SaleTicket };

function isAndroid() {
  return typeof navigator !== "undefined" && /android/i.test(navigator.userAgent);
}

// En la tablet (Android) se imprime por RawBT via USB. En cualquier otro
// dispositivo (PC de escritorio) se usa QZ Tray, que es lo que ya andaba ahi.
export async function printSaleTicket(ticket: SaleTicket) {
  if (isAndroid()) {
    return printSaleTicketByRawBt(ticket);
  }

  return printSaleTicketByQz(ticket);
}
