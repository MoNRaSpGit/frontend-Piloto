import qz from "qz-tray";
import { API_BASE_URL } from "../../../shared/config/api";
import { buildRawTicketLines, type SaleTicket } from "./piloto.ticketFormat";

export type { SaleTicket };

const FALLBACK_PREFERRED_PRINTER = "ImpRamon";

let cachedPrinterName = FALLBACK_PREFERRED_PRINTER;

// Firma cada conexion con el certificado del backend (ver
// piloto-printing.service.ts#getQzCertificate / signQzRequest, mismo
// mecanismo y mismo certificado que ya usan Joker y Ejemplo) para que QZ
// Tray confie en el sitio automaticamente: sin esto, QZ muestra un cartel
// de "Signature (missing) / Validity (invalid)" en cada conexion.
let qzSecurityConfigured = false;

function configureQzSecurity() {
  if (qzSecurityConfigured) return;
  qzSecurityConfigured = true;

  qz.security.setCertificatePromise((resolve, reject) => {
    fetch(`${API_BASE_URL}/piloto/qz-certificate`)
      .then((response) => (response.ok ? response.text() : Promise.reject(new Error("No se pudo obtener el certificado."))))
      .then(resolve)
      .catch(reject);
  });

  qz.security.setSignatureAlgorithm("SHA512");
  qz.security.setSignaturePromise((toSign) => (resolve, reject) => {
    fetch(`${API_BASE_URL}/piloto/qz-sign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toSign })
    })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error("No se pudo firmar la conexion."))))
      .then((data: { signature: string }) => resolve(data.signature))
      .catch(reject);
  });
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
  configureQzSecurity();
  if (!qz.websocket.isActive()) {
    await qz.websocket.connect();
  }
}

export async function printSaleTicketByQz(ticket: SaleTicket) {
  await ensureQzConnected();
  const data = buildRawTicketLines(ticket, { drawerKick: true });

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
