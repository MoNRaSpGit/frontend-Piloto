import { useEffect, useMemo, useState, type FormEvent } from "react";
import { toast } from "react-toastify";
import { createClient, deleteClient, listAccountEntries, listClients, settleAccount } from "../piloto.api";
import { printSaleTicketByQz } from "../services/piloto.qzPrint";
import type { CartItem, PilotoAccountEntry, PilotoClient } from "../piloto.types";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency: "UYU",
    maximumFractionDigits: 0
  }).format(amount);
}

function formatDate(isoDate: string) {
  return new Date(isoDate).toLocaleString("es-UY", {
    timeZone: "America/Montevideo",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

// "Clientes" / cuenta corriente (06/10/2026, pedido explicito: "hacerlo
// con tres columnas, como habiamos hecho en el Joker" -- izquierda para
// ingresar, medio con el listado, derecha con el detalle de lo que llevo
// ese cliente). En mobile (ver CSS) las 3 columnas se apilan una abajo
// de la otra -- a la izquierda el formulario, en el medio la lista, y la
// de la derecha solo aparece cuando hay alguien elegido.
export function ClientesScreen({ onClose }: { onClose: () => void }) {
  const [clients, setClients] = useState<PilotoClient[] | null>(null);
  const [entries, setEntries] = useState<PilotoAccountEntry[]>([]);
  const [search, setSearch] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);

  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const [isConfirmingSettle, setIsConfirmingSettle] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  function reload() {
    Promise.all([listClients(), listAccountEntries()])
      .then(([clientsData, entriesData]) => {
        setClients(clientsData);
        setEntries(entriesData);
      })
      .catch((error) => toast.error(error instanceof Error ? error.message : "No se pudo cargar clientes."));
  }

  useEffect(reload, []);

  const saldoPorCliente = useMemo(() => {
    const map = new Map<number, number>();
    for (const entry of entries) {
      map.set(entry.clientId, (map.get(entry.clientId) ?? 0) + entry.total);
    }
    return map;
  }, [entries]);

  const visibleClients = useMemo(() => {
    const term = search.trim().toLowerCase();
    const list = clients ?? [];
    return term ? list.filter((client) => client.name.toLowerCase().includes(term)) : list;
  }, [clients, search]);

  const selectedClient = clients?.find((client) => client.id === selectedClientId) ?? null;
  const selectedEntries = entries
    .filter((entry) => entry.clientId === selectedClientId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const selectedSaldo = selectedClientId !== null ? saldoPorCliente.get(selectedClientId) ?? 0 : 0;

  async function handleCreateClient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newName.trim()) {
      setCreateError("Ingresa el nombre del cliente.");
      return;
    }

    setIsCreating(true);
    setCreateError("");
    try {
      await createClient(newName.trim(), newPhone.trim() || undefined, newAddress.trim() || undefined);
      setNewName("");
      setNewPhone("");
      setNewAddress("");
      toast.success("Cliente creado.");
      reload();
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : "No se pudo crear el cliente.");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleSettle() {
    if (selectedClientId === null) return;
    try {
      await settleAccount(selectedClientId);
      toast.success("Cuenta saldada.");
      setIsConfirmingSettle(false);
      reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo saldar la cuenta.");
    }
  }

  async function handleDeleteClient() {
    if (selectedClientId === null) return;
    try {
      await deleteClient(selectedClientId);
      toast.success("Cliente borrado.");
      setIsConfirmingDelete(false);
      setSelectedClientId(null);
      reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo borrar el cliente.");
    }
  }

  // "Imprimir" (06/10/2026, pedido explicito: "no sea reimprimir sino
  // imprimir, un boton aparte, al lado del saldar cuenta -- va a ser una
  // sola factura larga, no una por boleta"). Junta TODAS las boletas
  // abiertas del cliente en un solo ticket, items uno abajo del otro.
  async function handlePrintAccount() {
    if (!selectedClient || selectedEntries.length === 0) return;

    setIsPrinting(true);
    try {
      const items: CartItem[] = selectedEntries.flatMap((entry) =>
        entry.items.map((item) => ({
          productId: 0,
          name: item.productName,
          price: item.unitPrice,
          quantity: item.quantity,
          imageUrl: null
        }))
      );
      await printSaleTicketByQz({
        externalId: `piloto-cuenta-${selectedClient.id}`,
        chargedAtIso: new Date().toISOString(),
        paymentMethod: "credito",
        items,
        total: selectedSaldo,
        storeName: `Fiado: ${selectedClient.name}`
      });
      toast.success("Cuenta impresa.");
    } catch (printError) {
      toast.error(printError instanceof Error ? `No se pudo imprimir: ${printError.message}` : "No se pudo imprimir la cuenta.");
    } finally {
      setIsPrinting(false);
    }
  }

  return (
    <div className="piloto-clientes">
      <button type="button" className="piloto-clientes-back" onClick={onClose}>
        {"‹"} Volver a Productos
      </button>

      <div className="piloto-clientes-columns">
        <section className="piloto-clientes-col piloto-clientes-col--form">
          <h2 className="piloto-clientes-col-title">Nuevo cliente</h2>
          <form onSubmit={handleCreateClient} className="piloto-clientes-form">
            <label className="piloto-modal-field">
              <span>Nombre</span>
              <input value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="Ej: Pablo Porto" disabled={isCreating} />
            </label>
            <label className="piloto-modal-field">
              <span>Telefono (opcional)</span>
              <input value={newPhone} onChange={(event) => setNewPhone(event.target.value)} placeholder="Ej: 099123456" disabled={isCreating} />
            </label>
            <label className="piloto-modal-field">
              <span>Direccion (opcional)</span>
              <input value={newAddress} onChange={(event) => setNewAddress(event.target.value)} placeholder="Ej: Calle y numero" disabled={isCreating} />
            </label>
            {createError ? <p className="piloto-scanner-status piloto-scanner-status--error">{createError}</p> : null}
            <button type="submit" className="piloto-button piloto-button--primary" disabled={isCreating}>
              {isCreating ? "Creando..." : "Crear cliente"}
            </button>
          </form>
        </section>

        <section className="piloto-clientes-col piloto-clientes-col--list">
          <h2 className="piloto-clientes-col-title">Clientes</h2>
          <input
            type="search"
            className="piloto-clientes-search"
            placeholder="Buscar cliente..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          {!clients ? (
            <p className="piloto-scanner-status">Cargando...</p>
          ) : visibleClients.length === 0 ? (
            <section className="piloto-empty-state">
              <p>No hay clientes que coincidan.</p>
            </section>
          ) : (
            <ul className="piloto-clientes-list">
              {visibleClients.map((client) => {
                const saldo = saldoPorCliente.get(client.id) ?? 0;
                const isActive = client.id === selectedClientId;
                return (
                  <li key={client.id}>
                    <button
                      type="button"
                      className={isActive ? "piloto-clientes-row is-active" : "piloto-clientes-row"}
                      onClick={() => {
                        setSelectedClientId(client.id);
                        setIsConfirmingSettle(false);
                        setIsConfirmingDelete(false);
                      }}
                    >
                      <span className="piloto-clientes-row__name">{client.name}</span>
                      <span className={saldo > 0 ? "piloto-clientes-row__debt piloto-clientes-row__debt--owes" : "piloto-clientes-row__debt"}>
                        {saldo > 0 ? `Debe ${formatCurrency(saldo)}` : "Al dia"}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="piloto-clientes-col piloto-clientes-col--detail">
          <h2 className="piloto-clientes-col-title">Detalle</h2>

          {!selectedClient ? (
            <section className="piloto-empty-state">
              <p>Elegi un cliente de la lista para ver lo que lleva.</p>
            </section>
          ) : (
            <>
              <div className="piloto-clientes-detail-header">
                <h3>{selectedClient.name}</h3>
                {selectedClient.phone ? <p className="piloto-clientes-meta">{selectedClient.phone}</p> : null}
                {selectedClient.address ? <p className="piloto-clientes-meta">{selectedClient.address}</p> : null}
              </div>

              <div className={selectedSaldo > 0 ? "piloto-clientes-saldo piloto-clientes-saldo--owes" : "piloto-clientes-saldo"}>
                <span>Debe</span>
                <strong>{formatCurrency(selectedSaldo)}</strong>
              </div>

              <div className="piloto-clientes-actions">
                {isConfirmingSettle ? (
                  <>
                    <span className="piloto-clientes-confirm-text">¿Saldar toda la cuenta?</span>
                    <button type="button" className="piloto-button piloto-button--primary" onClick={handleSettle}>
                      Si, saldar
                    </button>
                    <button type="button" className="piloto-button piloto-button--ghost" onClick={() => setIsConfirmingSettle(false)}>
                      No
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className="piloto-button piloto-button--primary"
                      onClick={() => setIsConfirmingSettle(true)}
                      disabled={selectedSaldo <= 0}
                    >
                      Saldar cuenta
                    </button>
                    <button
                      type="button"
                      className="piloto-button piloto-button--ghost"
                      onClick={() => void handlePrintAccount()}
                      disabled={selectedEntries.length === 0 || isPrinting}
                    >
                      {isPrinting ? "Imprimiendo..." : "Imprimir"}
                    </button>
                  </>
                )}
              </div>

              <h4 className="piloto-clientes-section-title">Boletas</h4>
              {selectedEntries.length === 0 ? (
                <section className="piloto-empty-state">
                  <p>No tiene boletas abiertas.</p>
                </section>
              ) : (
                <ul className="piloto-clientes-entries">
                  {selectedEntries.map((entry) => (
                    <li key={entry.id} className="piloto-clientes-entry">
                      <div className="piloto-clientes-entry__header">
                        <strong>{formatDate(entry.createdAt)}</strong>
                        <strong>{formatCurrency(entry.total)}</strong>
                      </div>
                      <ul className="piloto-clientes-entry__items">
                        {entry.items.map((item, index) => (
                          <li key={index}>
                            {item.quantity > 1 ? `${item.quantity}x ` : ""}
                            {item.productName}
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              )}

              <div className="piloto-clientes-danger-zone">
                {isConfirmingDelete ? (
                  <>
                    <span className="piloto-clientes-confirm-text">¿Borrar a {selectedClient.name}?</span>
                    <button type="button" className="piloto-button piloto-button--danger" onClick={handleDeleteClient}>
                      Si, borrar
                    </button>
                    <button type="button" className="piloto-button piloto-button--ghost" onClick={() => setIsConfirmingDelete(false)}>
                      No
                    </button>
                  </>
                ) : (
                  <button type="button" className="piloto-button piloto-button--ghost" onClick={() => setIsConfirmingDelete(true)}>
                    Borrar cliente
                  </button>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
