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
    <div className="h-full overflow-hidden surface-panel rounded-[2rem] p-6 md:p-8 flex flex-col gap-6 bg-slate-900">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">Conexiones</h1>
        <p className="text-slate-300 max-w-2xl">Invita usuarios, acepta solicitudes y usa estas conexiones para compartir carpetas, notebooks y documentos.</p>
      </div>

      <div className="rounded-2xl border border-orion-border dark:border-orion-dark-border p-4 md:p-5 space-y-4 bg-slate-900/80">
        <p className="text-xs uppercase tracking-widest font-bold text-slate-400">Buscar personas</p>
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por username, email o nombre"
            className="w-full input-orion pl-9"
          />
        </div>
        {query.trim().length >= 2 && (
          <div className="rounded-xl border border-orion-border dark:border-orion-dark-border divide-y divide-orion-border dark:divide-orion-dark-border max-h-56 overflow-y-auto">
            {searching ? (
              <div className="p-3 text-sm text-slate-300 flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Buscando...</div>
            ) : results.length === 0 ? (
              <div className="p-3 text-sm text-slate-400">No hay resultados.</div>
            ) : (
              results.map((user) => (
                <div key={user.id} className="p-3 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-white">{displayName(user)}</p>
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

      <div className="flex-1 min-h-0 rounded-2xl border border-orion-border dark:border-orion-dark-border bg-slate-900/70 overflow-y-auto divide-y divide-orion-border dark:divide-orion-dark-border">
        {loading ? (
          <div className="h-full min-h-[220px] flex items-center justify-center text-slate-300 gap-2">
            <Loader2 size={16} className="animate-spin" /> Cargando conexiones...
          </div>
        ) : activeList.length === 0 ? (
          <div className="h-full min-h-[220px] flex items-center justify-center text-slate-400 gap-2">
            <Users size={16} /> No hay elementos en esta vista.
          </div>
        ) : (
          activeList.map((item) => (
            <div key={item.id} className="p-4 flex items-center justify-between gap-3">
              <div>
                <Link
                  href={`/social/perfil/${item.user.id}`}
                  className="font-semibold text-white hover:text-blue-300 transition-colors"
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
  );
}

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-2 rounded-lg border transition-colors ${
        active
          ? "border-orion-primary bg-orion-primary/20 text-white"
          : "border-orion-border dark:border-orion-dark-border text-slate-300 hover:bg-slate-800"
      }`}
    >
      {label}
    </button>
  );
}
