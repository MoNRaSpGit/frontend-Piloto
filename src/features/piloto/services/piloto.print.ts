import { printSaleTicketByQz } from "./piloto.qzPrint";
import { printSaleTicketByRawBt } from "./piloto.rawbtPrint";
import type { SaleTicket } from "./piloto.ticketFormat";
import { printSaleTicketByWebUsb } from "./piloto.webusbPrint";

export type { SaleTicket };

// Orden: WebUSB primero (impresora por USB sin ningun software de por
// medio, lo que ya andaba en la tablet), QZ Tray como respaldo (PC de
// escritorio), y RawBT como ultimo recurso si ninguno de los dos anda.
export async function printSaleTicket(ticket: SaleTicket) {
  try {
    await printSaleTicketByWebUsb(ticket);
    return { method: "webusb" as const };
  } catch (webUsbError) {
    console.warn("[piloto-print] WebUSB fallo, probando QZ.", webUsbError);
  }

  try {
    await printSaleTicketByQz(ticket);
    return { method: "qz" as const };
  } catch (qzError) {
    console.warn("[piloto-print] QZ fallo, probando RawBT.", qzError);
  }

  await printSaleTicketByRawBt(ticket);
  return { method: "rawbt" as const };
}
