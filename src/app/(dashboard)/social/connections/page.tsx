"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, Search, UserMinus, UserPlus, Users } from "lucide-react";

type ConnectionUser = {
  id: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
};

type ConnectionItem = {
  id: string;
  user: ConnectionUser;
  createdAt?: string;
  acceptedAt?: string | null;
};

type ConnectionsPayload = {
  incomingPending: ConnectionItem[];
  outgoingPending: ConnectionItem[];
  accepted: ConnectionItem[];
};

type SearchUser = {
  id: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  connectionStatus: "PENDING" | "ACCEPTED" | "REJECTED" | null;
};

function displayName(user: ConnectionUser | SearchUser) {
  const value = `${user.firstName || ""} ${user.lastName || ""}`.trim();
  return value || user.username;
}

export default function ConnectionsPage() {
  const [tab, setTab] = useState<"incoming" | "outgoing" | "accepted">("accepted");
  const [loading, setLoading] = useState(true);
  const [connections, setConnections] = useState<ConnectionsPayload>({
    incomingPending: [],
    outgoingPending: [],
    accepted: [],
  });

  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchUser[]>([]);

  const loadConnections = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/social/connections", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "No se pudo cargar conexiones");
      }
      setConnections(data as ConnectionsPayload);
    } catch (error) {
      console.error("LOAD_CONNECTIONS_ERROR", error);
      setConnections({ incomingPending: [], outgoingPending: [], accepted: [] });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadConnections();
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      setSearching(true);
      try {
        const response = await fetch(`/api/social/users/search?q=${encodeURIComponent(query.trim())}`);
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "No se pudo buscar");
        }
        setResults(data as SearchUser[]);
      } catch (error) {
        console.error("SEARCH_USERS_ERROR", error);
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [query]);

  const sendRequest = async (targetUserId: string) => {
    try {
      const response = await fetch("/api/social/connections/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "No se pudo enviar la solicitud");
      }
      await loadConnections();
      setQuery("");
      setResults([]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo enviar";
      alert(message);
    }
  };

  const patchConnection = async (id: string, action: "accept" | "reject" | "cancel") => {
    try {
      const response = await fetch(`/api/social/connections/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "No se pudo actualizar");
      }
      await loadConnections();
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo actualizar";
      alert(message);
    }
  };

  const deleteConnection = async (id: string) => {
    try {
      const response = await fetch(`/api/social/connections/${id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "No se pudo eliminar");
      }
      await loadConnections();
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo eliminar";
      alert(message);
    }
  };

  const activeList = useMemo(() => {
    if (tab === "incoming") {
      return connections.incomingPending;
    }
    if (tab === "outgoing") {
      return connections.outgoingPending;
    }
    return connections.accepted;
  }, [connections, tab]);

  return (
    <div className="app-page">
      <div className="app-page-content">
      <div className="page-head bg-gradient-to-r from-cyan-100 to-sky-50 dark:from-slate-900 dark:to-slate-800">
        <h1 className="page-title">Conexiones</h1>
        <p className="page-subtitle max-w-2xl">Invita usuarios, acepta solicitudes y comparte recursos con tus contactos.</p>
      </div>

      <div className="section-panel space-y-4">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Buscar personas</p>
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por username, email o nombre"
            className="input-orion w-full pl-9"
          />
        </div>
        {query.trim().length >= 2 && (
          <div className="max-h-56 overflow-y-auto divide-y divide-orion-border rounded-2xl border border-orion-border dark:divide-orion-dark-border dark:border-orion-dark-border">
            {searching ? (
              <div className="flex items-center gap-2 p-3 text-sm text-slate-500 dark:text-slate-300"><Loader2 size={14} className="animate-spin" /> Buscando...</div>
            ) : results.length === 0 ? (
              <div className="p-3 text-sm text-slate-500 dark:text-slate-400">No hay resultados.</div>
            ) : (
              results.map((user) => (
                <div key={user.id} className="p-3 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{displayName(user)}</p>
                    <p className="text-xs text-slate-400">@{user.username}</p>
                  </div>
                  {user.connectionStatus === "ACCEPTED" ? (
                    <span className="text-xs px-2 py-1 rounded-md bg-emerald-500/20 text-emerald-300">Conectado</span>
                  ) : user.connectionStatus === "PENDING" ? (
                    <span className="text-xs px-2 py-1 rounded-md bg-amber-500/20 text-amber-300">Pendiente</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void sendRequest(user.id)}
                      className="btn-primary px-3 py-1.5 rounded-lg text-xs"
                    >
                      <UserPlus size={12} />
                      Conectar
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 text-xs">
        <TabButton label={`Conectados (${connections.accepted.length})`} active={tab === "accepted"} onClick={() => setTab("accepted")} />
        <TabButton label={`Enviadas (${connections.outgoingPending.length})`} active={tab === "outgoing"} onClick={() => setTab("outgoing")} />
        <TabButton label={`Pendientes (${connections.incomingPending.length})`} active={tab === "incoming"} onClick={() => setTab("incoming")} />
      </div>

      <div className="surface-panel flex-1 min-h-0 overflow-y-auto divide-y divide-orion-border rounded-3xl border border-orion-border dark:divide-orion-dark-border dark:border-orion-dark-border">
        {loading ? (
          <div className="flex h-full min-h-[220px] items-center justify-center gap-2 text-slate-500 dark:text-slate-300">
            <Loader2 size={16} className="animate-spin" /> Cargando conexiones...
          </div>
        ) : activeList.length === 0 ? (
          <div className="flex h-full min-h-[220px] items-center justify-center gap-2 text-slate-500 dark:text-slate-400">
            <Users size={16} /> No hay elementos en esta vista.
          </div>
        ) : (
          activeList.map((item) => (
            <div key={item.id} className="p-4 flex items-center justify-between gap-3">
              <div>
                  <Link
                    href={`/social/perfil/${item.user.id}`}
                    className="font-semibold text-slate-900 transition-colors hover:text-blue-600 dark:text-white dark:hover:text-blue-300"
                  >
                    {displayName(item.user)}
                  </Link>
                <p className="text-xs text-slate-400">@{item.user.username}</p>
              </div>

              {tab === "incoming" ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void patchConnection(item.id, "accept")}
                    className="btn-primary px-3 py-1.5 rounded-lg text-xs"
                  >
                    Aceptar
                  </button>
                  <button
                    type="button"
                    onClick={() => void patchConnection(item.id, "reject")}
                    className="h-9 px-3 rounded-lg border border-red-400/40 text-red-300 text-xs hover:bg-red-500/10"
                  >
                    Rechazar
                  </button>
                </div>
              ) : tab === "outgoing" ? (
                <button
                  type="button"
                  onClick={() => void patchConnection(item.id, "cancel")}
                  className="h-9 px-3 rounded-lg border border-amber-400/40 text-amber-300 text-xs hover:bg-amber-500/10"
                >
                  Cancelar
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void deleteConnection(item.id)}
                    className="h-9 px-3 rounded-lg border border-red-400/40 text-red-300 text-xs hover:bg-red-500/10 inline-flex items-center gap-1"
                  >
                    <UserMinus size={12} /> Quitar
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
      </div>
    </div>
  );
}

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-3 py-2 transition-colors ${
        active
          ? "border-orion-primary bg-orion-primary-soft text-orion-primary dark:bg-orion-primary/25 dark:text-blue-100"
          : "border-orion-border text-slate-600 hover:bg-slate-100 dark:border-orion-dark-border dark:text-slate-300 dark:hover:bg-slate-800"
      }`}
    >
      {label}
    </button>
  );
}
