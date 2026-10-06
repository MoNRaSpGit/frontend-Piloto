import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { AddClientModal } from "../components/AddClientModal";
import { createClient, deleteClient, listAccountEntries, listClients, settleAccount } from "../piloto.api";
import type { PilotoAccountEntry, PilotoClient } from "../piloto.types";

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

// "Clientes" / cuenta corriente (06/10/2026, pedido explicito: "venta a
// credito... armar toda la parte del cliente, similar a la de Joker,
// pero plan basico"). Pantalla de 2 pasos (lista -> detalle) en vez de 2
// columnas lado a lado, para que entre bien en el celular como el resto
// de Piloto.
export function ClientesScreen({ onClose }: { onClose: () => void }) {
  const [clients, setClients] = useState<PilotoClient[] | null>(null);
  const [entries, setEntries] = useState<PilotoAccountEntry[]>([]);
  const [search, setSearch] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isConfirmingSettle, setIsConfirmingSettle] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

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
  const selectedEntries = entries.filter((entry) => entry.clientId === selectedClientId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const selectedSaldo = selectedClientId !== null ? saldoPorCliente.get(selectedClientId) ?? 0 : 0;

  async function handleAddClient(name: string, phone: string, address: string) {
    try {
      await createClient(name, phone || undefined, address || undefined);
      setIsAddOpen(false);
      reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo crear el cliente.");
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

  if (selectedClient) {
    return (
      <div className="piloto-clientes">
        <button type="button" className="piloto-clientes-back" onClick={() => setSelectedClientId(null)}>
          {"‹"} Volver a clientes
        </button>

        <div className="piloto-clientes-detail-header">
          <h2>{selectedClient.name}</h2>
          {selectedClient.phone ? <p className="piloto-clientes-meta">{selectedClient.phone}</p> : null}
          {selectedClient.address ? <p className="piloto-clientes-meta">{selectedClient.address}</p> : null}
        </div>

        <div className="piloto-clientes-saldo">
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
            <button
              type="button"
              className="piloto-button piloto-button--primary"
              onClick={() => setIsConfirmingSettle(true)}
              disabled={selectedSaldo <= 0}
            >
              Saldar cuenta
            </button>
          )}
        </div>

        <h3 className="piloto-clientes-section-title">Boletas</h3>
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
                <p className="piloto-clientes-entry__items">
                  {entry.items.map((item) => (item.quantity > 1 ? `${item.quantity}x ${item.productName}` : item.productName)).join(", ")}
                </p>
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
      </div>
    );
  }

  return (
    <div className="piloto-clientes">
      <div className="piloto-clientes-toolbar">
        <button type="button" className="piloto-clientes-back" onClick={onClose}>
          {"‹"} Volver
        </button>
        <button type="button" className="piloto-button piloto-button--primary" onClick={() => setIsAddOpen(true)}>
          + Nuevo cliente
        </button>
      </div>

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
            return (
              <li key={client.id}>
                <button type="button" className="piloto-clientes-row" onClick={() => setSelectedClientId(client.id)}>
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

      {isAddOpen ? <AddClientModal onClose={() => setIsAddOpen(false)} onConfirm={handleAddClient} /> : null}
    </div>
  );
}
