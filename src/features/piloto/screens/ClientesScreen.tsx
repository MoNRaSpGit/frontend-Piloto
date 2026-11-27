import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { toast } from "react-toastify";
import { createClient, deleteClient, listAccountEntries, listAccountPayments, listClients, registerAccountPayment } from "../piloto.api";
import { accountBalance, createRequestKeeper, formatAccountAmount as formatCurrency, formatAccountDate as formatDate } from "../piloto.account";
import { AccountPaymentModal } from "../components/AccountPaymentModal";
import { printSaleTicketByQz } from "../services/piloto.qzPrint";
import type { CartItem, PilotoAccountEntry, PilotoAccountPayment, PilotoClient } from "../piloto.types";

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

  const [payments, setPayments] = useState<PilotoAccountPayment[]>([]);
  const [paymentMode, setPaymentMode] = useState<"full" | "partial" | null>(null);
  const [isPaying, setIsPaying] = useState(false);
  const paymentRequest = useRef(createRequestKeeper());
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  function reload() {
    Promise.all([listClients(), listAccountEntries(), listAccountPayments()])
      .then(([clientsData, entriesData, paymentsData]) => {
        setClients(clientsData);
        setEntries(entriesData);
        setPayments(paymentsData);
      })
      .catch((error) => toast.error(error instanceof Error ? error.message : "No se pudo cargar clientes."));
  }

  useEffect(reload, []);

  const saldoPorCliente = useMemo(() => {
    const map = new Map<number, number>();
    for (const clientId of new Set(entries.map((entry) => entry.clientId))) {
      map.set(
        clientId,
        accountBalance(
          entries.filter((entry) => entry.clientId === clientId),
          payments.filter((payment) => payment.clientId === clientId)
        )
      );
    }
    return map;
  }, [entries, payments]);

  const visibleClients = useMemo(() => {
    const term = search.trim().toLowerCase();
    const list = clients ?? [];
    return term ? list.filter((client) => client.name.toLowerCase().includes(term)) : list;
  }, [clients, search]);

  const selectedClient = clients?.find((client) => client.id === selectedClientId) ?? null;
  const selectedEntries = entries
    .filter((entry) => entry.clientId === selectedClientId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const selectedPayments = payments.filter((payment) => payment.clientId === selectedClientId);
  const selectedSaldo = selectedClientId !== null ? saldoPorCliente.get(selectedClientId) ?? 0 : 0;
  // Boletas y pagos de la cuenta abierta, lo mas nuevo arriba.
  const movements = [
    ...selectedEntries.map((entry) => ({ key: `f${entry.id}`, createdAt: entry.createdAt, entry, payment: null })),
    ...selectedPayments.map((payment) => ({ key: `p${payment.id}`, createdAt: payment.createdAt, entry: null, payment }))
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

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

  async function handlePayment(amount: number) {
    if (selectedClientId === null || paymentMode === null) return;
    const settle = paymentMode === "full";
    setIsPaying(true);
    try {
      const requestId = paymentRequest.current.idFor(`${selectedClientId}|${amount}|${selectedSaldo}`);
      const { balanceAfter } = await registerAccountPayment({ requestId, clientId: selectedClientId, amount, settle });
      paymentRequest.current.done();
      toast.success(balanceAfter === 0 ? "Cuenta saldada." : `Pago anotado. Queda debiendo ${formatCurrency(balanceAfter)}.`);
      setPaymentMode(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo registrar el pago.");
    } finally {
      setIsPaying(false);
      reload();
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
    if (!selectedClient || movements.length === 0) return;

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
      // Los pagos parciales van restando, asi el total del ticket cierra.
      for (const payment of selectedPayments) {
        items.push({
          productId: 0,
          name: `Pago ${formatDate(payment.createdAt).slice(0, 5)}`,
          price: -payment.amount,
          quantity: 1,
          imageUrl: null
        });
      }
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
                        setPaymentMode(null);
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
                <button type="button" className="piloto-button piloto-button--primary" onClick={() => setPaymentMode("full")} disabled={selectedSaldo <= 0}>
                  Saldar cuenta
                </button>
                <button type="button" className="piloto-button piloto-button--pay" onClick={() => setPaymentMode("partial")} disabled={selectedSaldo <= 0}>
                  Pagó una parte
                </button>
                <button
                  type="button"
                  className="piloto-button piloto-button--ghost"
                  onClick={() => void handlePrintAccount()}
                  disabled={movements.length === 0 || isPrinting}
                >
                  {isPrinting ? "Imprimiendo..." : "Imprimir"}
                </button>
              </div>

              <h4 className="piloto-clientes-section-title">Boletas</h4>
              {movements.length === 0 ? (
                <section className="piloto-empty-state">
                  <p>No tiene boletas abiertas.</p>
                </section>
              ) : (
                <ul className="piloto-clientes-entries">
                  {movements.map(({ key, entry, payment }) =>
                    entry ? (
                      <li key={key} className="piloto-clientes-entry">
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
                    ) : (
                      <li key={key} className="piloto-clientes-entry piloto-clientes-entry--payment">
                        <div className="piloto-clientes-entry__header">
                          <strong>Pagó · {formatDate(payment!.createdAt)}</strong>
                          <strong>- {formatCurrency(payment!.amount)}</strong>
                        </div>
                      </li>
                    )
                  )}
                </ul>
              )}

              {paymentMode ? (
                <AccountPaymentModal
                  clientName={selectedClient.name}
                  balance={selectedSaldo}
                  mode={paymentMode}
                  isSubmitting={isPaying}
                  onClose={() => setPaymentMode(null)}
                  onConfirm={(amount) => void handlePayment(amount)}
                />
              ) : null}

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
                  <button
                    type="button"
                    className="piloto-button piloto-button--ghost"
                    onClick={() => setIsConfirmingDelete(true)}
                    disabled={selectedSaldo !== 0}
                  >
                    {selectedSaldo !== 0 ? "No se puede borrar: tiene saldo" : "Borrar cliente"}
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
