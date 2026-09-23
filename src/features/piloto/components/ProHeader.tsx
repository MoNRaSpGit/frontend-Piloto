type ProTopTab = "productos" | "precios";

type ProHeaderProps = {
  activeTopTab: ProTopTab;
  onSelectTab: (tab: ProTopTab) => void;
  onTitleClick: () => void;
};

// Cabecera de Modo Pro (23/09/2026, pedido explicito): "cabecera
// visualmente delimitada... logo/identidad de Piloto... las pestanas
// Productos y Precios integradas en esa cabecera". Solo se usa en Pro --
// el Modo Basico sigue con el <header> simple de siempre (ver
// PilotoHomePage.tsx), asi que todas las clases de aca son nuevas y
// exclusivas de esto, no comparten nada con el resto de la app.
//
// El nombre "Piloto" sigue siendo el disparador oculto de 3 clics para
// el selector de modo (onTitleClick) -- mismo mecanismo de siempre, solo
// que ahora vive dentro de esta cabecera mas prolija.
export function ProHeader({ activeTopTab, onSelectTab, onTitleClick }: ProHeaderProps) {
  return (
    <header className="piloto-pro-header">
      <button type="button" className="piloto-pro-brand" onClick={onTitleClick} aria-label="Piloto">
        <span className="piloto-pro-brand__mark" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M3 5v14M6.4 5v14M8.4 5v14M12.2 5v14M15.2 5v14M17.4 5v14M21 5v14" />
          </svg>
        </span>
        <span className="piloto-pro-brand__text">
          Piloto
          <span className="piloto-pro-badge">PRO</span>
        </span>
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
