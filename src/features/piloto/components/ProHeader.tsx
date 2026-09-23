type ProTopTab = "productos" | "precios";

type ProHeaderProps = {
  activeTopTab: ProTopTab;
  onSelectTab: (tab: ProTopTab) => void;
  onTitleClick: () => void;
};

// Cabecera de Modo Pro (23/09/2026, pedido explicito): "cabecera
// visualmente delimitada... las pestanas Productos y Precios integradas
// en esa cabecera". Solo se usa en Pro -- el Modo Basico sigue con el
// <header> simple de siempre (ver PilotoHomePage.tsx), asi que todas las
// clases de aca son nuevas y exclusivas de esto, no comparten nada con
// el resto de la app.
//
// Pedido explicito (24/09/2026): "quitale el logo y la palabra Pro, solo
// dejale Piloto" -- sin icono ni insignia, solo el nombre.
//
// El nombre "Piloto" sigue siendo el disparador oculto de 3 clics para
// el selector de modo (onTitleClick) -- mismo mecanismo de siempre, solo
// que ahora vive dentro de esta cabecera mas prolija.
export function ProHeader({ activeTopTab, onSelectTab, onTitleClick }: ProHeaderProps) {
  return (
    <header className="piloto-pro-header">
      <button type="button" className="piloto-pro-brand" onClick={onTitleClick}>
        Piloto
      </button>

      <nav className="piloto-pro-nav" role="tablist" aria-label="Secciones">
        <button
          type="button"
          role="tab"
          aria-selected={activeTopTab === "productos"}
          className={activeTopTab === "productos" ? "piloto-pro-nav-tab is-active" : "piloto-pro-nav-tab"}
          onClick={() => onSelectTab("productos")}
        >
          Productos
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTopTab === "precios"}
          className={activeTopTab === "precios" ? "piloto-pro-nav-tab is-active" : "piloto-pro-nav-tab"}
          onClick={() => onSelectTab("precios")}
        >
          Precios
        </button>
      </nav>
    </header>
  );
}
