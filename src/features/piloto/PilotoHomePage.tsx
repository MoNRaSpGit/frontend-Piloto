import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { createProduct, createSale, findProductByBarcode, normalizeBarcode, updateProduct } from "./piloto.api";
import { ManualProductModal } from "./components/ManualProductModal";
import { PilotoModeModal } from "./components/PilotoModeModal";
import { RegisterTabs } from "./components/RegisterTabs";
import { ScannerCart } from "./components/ScannerCart";
import { ScannerCheckout } from "./components/ScannerCheckout";
import { ScannerInput } from "./components/ScannerInput";
import { ScannerQuickAddModal } from "./components/ScannerQuickAddModal";
import { usePilotoCart, type PilotoRegisterId } from "./hooks/usePilotoCart";
import { usePilotoMode } from "./piloto.mode";
import { printSaleTicketByQz } from "./services/piloto.qzPrint";
import { setAppBusy } from "../../shared/state/appActivity";

const NOT_FOUND_MESSAGE = "Producto no encontrado.";
// Ya no se elige medio de pago en la UI (pedido explicito, 16/09/2026:
// "saca lo de tarjeta efectivo y demas") -- se manda siempre este valor
// fijo, tanto a la venta como al ticket.
const FIXED_PAYMENT_METHOD = "efectivo" as const;
// Atajo de teclado: cualquiera de las 4 flechas abre "Producto manual". Arriba
// y abajo no se usan para nada dentro de un campo de texto de una linea en
// este proyecto, asi que se dejan "dominantes" (abren el modal incluso
// escribiendo). Izquierda y derecha si hacen falta ahi (mover el cursor para
// corregir sin mouse), asi que dentro de un campo editable se ignoran.
const DOMINANT_ARROW_KEYS = new Set(["ArrowUp", "ArrowDown"]);
const ARROW_KEYS = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);
// Selector de modo oculto (23/09/2026, pedido explicito): 3 clics sobre el
// titulo "Piloto" lo abren. Los 3 clics tienen que caer dentro de esta
// ventana de tiempo -- si no, no cuentan (para que no se dispare por
// accidente con toques sueltos).
const MODE_UNLOCK_CLICK_WINDOW_MS = 1500;
const MODE_UNLOCK_CLICK_COUNT = 3;

export function PilotoHomePage() {
  const [barcodeInput, setBarcodeInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [focusSignal, setFocusSignal] = useState(0);
  const [quickAddBarcode, setQuickAddBarcode] = useState<string | null>(null);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  // Vive aca (no adentro de ScannerCart) para que el efecto de mas abajo
  // se entere de cuando este modal se abre/cierra tambien -- pedido
  // explicito (16/09/2026): "cierro un producto... siempre el cursor
  // vuelve al input".
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const { mode, setMode, isPro } = usePilotoMode();
  const [isModeModalOpen, setIsModeModalOpen] = useState(false);
  const titleClickCountRef = useRef(0);
  const titleClickTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (titleClickTimeoutRef.current !== null) window.clearTimeout(titleClickTimeoutRef.current);
    };
  }, []);
  const {
    cartItems,
    lastScannedProductId,
    addProduct,
    addManualItem,
    addOne,
    removeOne,
    updateItem,
    clearCart,
    total,
    activeRegisterId,
    setActiveRegisterId,
    registerSummaries
  } = usePilotoCart();

  // Al cerrarse CUALQUIER modal (cobro, alta rapida, producto manual o
  // edicion de un producto del carrito), devolver el foco al input del
  // escaner para seguir escaneando sin tocar el mouse -- pedido
  // explicito (16/09/2026): "cada accion que se haga luego vuelva al
  // input del escaner, ya sea que cierro un producto, cobro, o hago
  // cualquier otra cosa".
  useEffect(() => {
    if (!isCheckoutOpen && !quickAddBarcode && !isManualModalOpen && editingProductId === null) {
      setFocusSignal((signal) => signal + 1);
    }
  }, [isCheckoutOpen, quickAddBarcode, isManualModalOpen, editingProductId]);

  // Le avisa a AppUpdateNotice si es seguro actualizar solo (pedido
  // explicito, 22/09/2026): "ocupada" = hay algun modal/proceso abierto O
  // hay productos cargados en CUALQUIER caja (no solo la activa -- Caja 2
  // puede tener una venta pendiente mientras se mira la Caja 1 vacia).
  const hasPendingProducts = registerSummaries.some((register) => register.count > 0);
  useEffect(() => {
    setAppBusy(hasPendingProducts || isCheckoutOpen || !!quickAddBarcode || isManualModalOpen || editingProductId !== null);
    return () => setAppBusy(false);
  }, [hasPendingProducts, isCheckoutOpen, quickAddBarcode, isManualModalOpen, editingProductId]);

  // Modo Basico/Pro (23/09/2026, pedido explicito): en Basico solo se ve
  // Caja 1 -- las cajas y la impresora son funcionalidades Pro. Los
  // carritos de las demas cajas NO se borran al pasar a Basico (siguen
  // vivos adentro de usePilotoCart), solo se dejan de mostrar/elegir; por
  // eso, si justo estaba parado en otra caja cuando se cambia a Basico, se
  // fuerza a volver a la primera para no quedar viendo una caja que ya no
  // tiene pestana visible.
  const visibleRegisterSummaries = isPro ? registerSummaries : registerSummaries.slice(0, 1);
  useEffect(() => {
    if (!isPro && activeRegisterId !== registerSummaries[0]?.id) {
      setActiveRegisterId(registerSummaries[0].id);
    }
  }, [isPro, activeRegisterId, registerSummaries, setActiveRegisterId]);

  // Atajo de teclado (20/09/2026, pedido explicito: "cambiar de boton a las
  // flechitas... que predomine la flechita, sin importar q este en un input
  // q si aprieto la flechita abra el PM, xq la idea es que no se use el
  // mouse... y tener en cuenta si molesta en alguna accion de venta").
  // Cualquiera de las 4 flechas abre "Producto manual", igual que si se
  // clickeara el boton -- INCLUSO si el foco esta en un input, salvo
  // izquierda/derecha dentro de un campo editable, que se dejan mover el
  // cursor (ver DOMINANT_ARROW_KEYS mas arriba). No duplica modales si ya
  // hay otro abierto.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!ARROW_KEYS.has(event.key)) return;

      const target = event.target as HTMLElement | null;
      const isEditable =
        !!target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable);
      if (isEditable && !DOMINANT_ARROW_KEYS.has(event.key)) return;

      if (isManualModalOpen || isCheckoutOpen || quickAddBarcode || editingProductId !== null) return;

      // preventDefault: que la flecha no mueva el foco entre botones ni
      // haga scroll de la pagina.
      event.preventDefault();
      setIsManualModalOpen(true);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isManualModalOpen, isCheckoutOpen, quickAddBarcode, editingProductId]);

  function handleEmptyEnter() {
    if (!cartItems.length) return;
    setIsCheckoutOpen(true);
  }

  // El boton "x" (y la fila del producto, para sumar 1 mas) del carrito
  // le sacan el foco al buscador -- queda en el propio elemento
  // clickeado, foco nativo del navegador. Se reenfoca igual que al
  // cerrar cualquier modal, para poder seguir escaneando sin tocar el
  // mouse.
  function handleRemoveOne(productId: number) {
    removeOne(productId);
    setFocusSignal((signal) => signal + 1);
  }

  function handleAddOne(productId: number) {
    addOne(productId);
    setFocusSignal((signal) => signal + 1);
  }

  async function handleSearch(barcode: string) {
    setIsLoading(true);
    setError("");

    try {
      const response = await findProductByBarcode(barcode);
      addProduct(response.item);
    } catch (searchError) {
      const message = searchError instanceof Error ? searchError.message : "No se pudo buscar el producto.";
      if (message === NOT_FOUND_MESSAGE) {
        setQuickAddBarcode(normalizeBarcode(barcode));
      } else {
        setError(message);
      }
    } finally {
      setIsLoading(false);
      setBarcodeInput("");
    }
  }

  async function handleQuickAddConfirm(name: string, price: number) {
    if (!quickAddBarcode) return false;

    try {
      const response = await createProduct(quickAddBarcode, name, price);
      addProduct(response.item);
      setQuickAddBarcode(null);
      // Empuje explicito ademas del efecto general que reenfoca al cerrar
      // cualquier modal -- asi el proximo escaneo cae siempre en el
      // buscador, sin depender de que ese efecto llegue a tiempo.
      setFocusSignal((signal) => signal + 1);
      return true;
    } catch (createError) {
      toast.error(createError instanceof Error ? createError.message : "No se pudo guardar el producto.");
      return false;
    }
  }

  async function handleEditCartItem(productId: number, changes: { name: string; price: number }) {
    // Ids negativos son lineas manuales locales (sin producto real en el
    // catalogo): solo se actualiza el carrito, no hay nada que guardar en la BD.
    if (productId <= 0) {
      updateItem(productId, changes);
      return true;
    }

    try {
      await updateProduct(productId, changes.name, changes.price);
      updateItem(productId, changes);
      toast.success("Producto actualizado.");
      return true;
    } catch (updateError) {
      toast.error(updateError instanceof Error ? updateError.message : "No se pudo guardar el producto.");
      return false;
    }
  }

  function handleManualConfirm(price: number) {
    addManualItem(price);
    setIsManualModalOpen(false);
  }

  // 3 clics sobre "Piloto" abren el selector de modo, oculto para no
  // molestar al usuario normal (pedido explicito, 23/09/2026). Si pasa
  // mas de MODE_UNLOCK_CLICK_WINDOW_MS entre un clic y el siguiente, el
  // contador se reinicia -- clics sueltos durante el uso normal no lo
  // disparan por accidente.
  function handleTitleClick() {
    if (titleClickTimeoutRef.current !== null) {
      window.clearTimeout(titleClickTimeoutRef.current);
    }

    titleClickCountRef.current += 1;
    if (titleClickCountRef.current >= MODE_UNLOCK_CLICK_COUNT) {
      titleClickCountRef.current = 0;
      setIsModeModalOpen(true);
      return;
    }

    titleClickTimeoutRef.current = window.setTimeout(() => {
      titleClickCountRef.current = 0;
    }, MODE_UNLOCK_CLICK_WINDOW_MS);
  }

  function handleSelectMode(nextMode: typeof mode) {
    setMode(nextMode);
    setIsModeModalOpen(false);
  }

  // Al cambiar de caja se cierra cualquier modal que hubiera quedado
  // abierto (cobro, alta rapida, edicion) -- esos modales actuan sobre el
  // carrito de la caja que estaba activa, y seguir con uno abierto
  // apuntando a la caja anterior podria terminar agregando o editando algo
  // en la caja equivocada. El foco vuelve solo al buscador (ver el efecto
  // de mas arriba, que reacciona a que no quede ningun modal abierto).
  function handleSelectRegister(registerId: PilotoRegisterId) {
    if (registerId === activeRegisterId) return;
    setActiveRegisterId(registerId);
    setIsCheckoutOpen(false);
    setQuickAddBarcode(null);
    setIsManualModalOpen(false);
    setEditingProductId(null);
    // Empuje explicito (22/09/2026, pedido explicito): el efecto de mas
    // arriba solo reenfoca cuando ALGUNO de esos 4 modales cambia de
    // abierto a cerrado -- si ya estaban todos cerrados (el caso normal
    // al tocar una pestana de caja), no se disparaba y el foco se quedaba
    // en el boton de la pestana en vez de volver al buscador.
    setFocusSignal((signal) => signal + 1);
  }

  // Pedido explicito (18/09/2026): "quitale cualquier cosa que tenga para
  // imprimir, todavia no vamos a imprimir... que ponga cobrar y que cobre
  // y chao, y empiece todo de vuelta". Se sacó el intento de imprimir
  // (printSaleTicket) que tiraba el cartel de "no encontro dispositivo" --
  // por ahora la venta se confirma y listo, sin tocar nada de impresion.
  async function handleCharge() {
    try {
      const ticketItems = cartItems;
      const ticketTotal = total;
      await createSale(cartItems, FIXED_PAYMENT_METHOD);
      clearCart();
      toast.success("Venta confirmada.");

      // Impresion por QZ Tray (22/09/2026, pedido explicito; ahora
      // ademas Pro-only, 23/09/2026: "en Basico no intenta imprimir"):
      // "si hay impresora imprime y listo, si no hay no imprime
      // claramente pero no tranca la venta ni nada de eso". La venta ya
      // quedo confirmada y el carrito ya se vacio arriba -- esto se
      // dispara SIN esperar (sin await) para que el modal de cobro se
      // cierre al toque, sin quedar colgado mientras QZ Tray intenta
      // conectar (puede tardar si esta cerrado o no hay impresora). El
      // error, si lo hay, se avisa cuando llegue, aparte.
      if (isPro) {
        void printSaleTicketByQz({
          externalId: `piloto-${Date.now()}`,
          chargedAtIso: new Date().toISOString(),
          paymentMethod: FIXED_PAYMENT_METHOD,
          items: ticketItems,
          total: ticketTotal
        }).catch((printError) => {
          toast.error(printError instanceof Error ? `No se pudo imprimir: ${printError.message}` : "No se pudo imprimir el ticket.");
        });
      }

      return true;
    } catch (chargeError) {
      toast.error(chargeError instanceof Error ? chargeError.message : "No se pudo confirmar la venta.");
      return false;
    }
  }

  return (
    <main className="piloto-shell">
      <header className="piloto-header">
        {/* Selector de modo oculto: 3 clics para abrirlo (ver
            handleTitleClick). No tiene pinta de boton a proposito, para
            que el usuario normal no note que hace algo. */}
        <button type="button" className="piloto-kicker piloto-kicker--button" onClick={handleTitleClick}>
          Piloto
        </button>
      </header>

      <RegisterTabs registers={visibleRegisterSummaries} activeRegisterId={activeRegisterId} onSelect={handleSelectRegister} />

      <ScannerInput
        value={barcodeInput}
        onChange={setBarcodeInput}
        onSubmit={handleSearch}
        onEmptyEnter={handleEmptyEnter}
        isLoading={isLoading}
        error={error}
        focusSignal={focusSignal}
      />

      <button type="button" className="piloto-manual-btn" onClick={() => setIsManualModalOpen(true)}>
        Producto Manual
      </button>

      {cartItems.length ? (
        <>
          <ScannerCart
            items={cartItems}
            lastScannedProductId={lastScannedProductId}
            onAddOne={handleAddOne}
            onRemoveOne={handleRemoveOne}
            onEdit={handleEditCartItem}
            editingProductId={editingProductId}
            onSetEditingProductId={setEditingProductId}
          />
          <ScannerCheckout
            total={total}
            isOpen={isCheckoutOpen}
            onOpen={() => setIsCheckoutOpen(true)}
            onClose={() => setIsCheckoutOpen(false)}
            onCharge={handleCharge}
          />
        </>
      ) : (
        <section className="piloto-empty-state">
          <p>Todavia no escaneaste ningun producto.</p>
        </section>
      )}

      {quickAddBarcode ? (
        <ScannerQuickAddModal
          barcode={quickAddBarcode}
          onClose={() => setQuickAddBarcode(null)}
          onConfirm={handleQuickAddConfirm}
        />
      ) : null}

      {isManualModalOpen ? (
        <ManualProductModal onClose={() => setIsManualModalOpen(false)} onConfirm={handleManualConfirm} />
      ) : null}

      {isModeModalOpen ? (
        <PilotoModeModal mode={mode} onSelect={handleSelectMode} onClose={() => setIsModeModalOpen(false)} />
      ) : null}
    </main>
  );
}
