import type { PilotoPriceCategory } from "../piloto.types";

type CategoryIconProps = {
  category: PilotoPriceCategory;
  size?: number;
};

// Iconos chicos para las 4 categorias, Modo Pro (23/09/2026, pedido
// explicito: "pequenas ilustraciones/iconos relacionados a cada una de
// las 4 categorias"). Se usan en dos lugares que representan la MISMA
// categoria (los botones de venta rapida y las subpestanas de Precios),
// asi que viven en un solo componente compartido en vez de duplicar el
// dibujo en cada lugar. SVG a mano, formas simples (nada generativo ni
// fotorealista) para que se vean bien en cualquier tamano chico.
export function CategoryIcon({ category, size = 22 }: CategoryIconProps) {
  const commonProps = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none" as const,
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true
  };

  if (category === "frutas_verduras") {
    // Hoja: simple y reconocible como "fresco/verde".
    return (
      <svg {...commonProps}>
        <path d="M4 20c0-8.5 6.5-15 15-15 0 8.5-6.5 15-15 15z" />
        <path d="M8.5 15.5 17 7" />
      </svg>
    );
  }

  if (category === "congelados") {
    // Copo de nieve: 3 lineas cruzadas + puntas chicas.
    return (
      <svg {...commonProps}>
        <path d="M12 3v18M4.8 7l14.4 10M19.2 7 4.8 17" />
        <path d="M12 3l-2 2M12 3l2 2M12 21l-2-2M12 21l2-2" />
      </svg>
    );
  }

  if (category === "empanadas") {
    // Medialuna sobre una base, con marcas del repulgue.
    return (
      <svg {...commonProps}>
        <path d="M4 15a8 8 0 0 1 16 0z" />
        <path d="M7.5 15v-1.4M11 15v-2M14.5 15v-2M18 15v-1.4" />
      </svg>
    );
  }

  // "otros": 4 cuadrados, variedad/misceláneo.
  return (
    <svg {...commonProps}>
      <rect x="4" y="4" width="7" height="7" rx="1.6" />
      <rect x="13" y="4" width="7" height="7" rx="1.6" />
      <rect x="4" y="13" width="7" height="7" rx="1.6" />
      <rect x="13" y="13" width="7" height="7" rx="1.6" />
    </svg>
  );
}
