// Campo Precio solo numerico (22/10/2026, pedido explicito: "que no se
// pueda escribir un nombre en el precio"). Deja pasar digitos y UN
// separador decimal (coma o punto, el resto del codigo ya convierte la
// coma) con hasta 2 decimales; cualquier otra tecla o texto pegado se
// descarta.
export function sanitizePriceInput(value: string): string {
  const cleaned = value.replace(/[^\d.,]/g, "");
  const separatorIndex = cleaned.search(/[.,]/);
  if (separatorIndex === -1) return cleaned;
  const integerPart = cleaned.slice(0, separatorIndex);
  const decimalPart = cleaned.slice(separatorIndex + 1).replace(/[.,]/g, "").slice(0, 2);
  return `${integerPart}${cleaned[separatorIndex]}${decimalPart}`;
}
