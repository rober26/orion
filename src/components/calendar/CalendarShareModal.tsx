"use client";

import { useEffect, useMemo, useState } from "react";
import type { CalendarMemberItem, UserCalendarItem } from "@/src/components/calendar/types";

interface SearchUserItem {
  id: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
}

interface CalendarShareModalProps {
  open: boolean;
  calendars: UserCalendarItem[];
  initialCalendarId?: string | null;
  onClose: () => void;
  onChanged: () => Promise<void>;
}

function fullName(user: SearchUserItem | CalendarMemberItem["user"]): string {
  const value = `${user.firstName || ""} ${user.lastName || ""}`.trim();
  return value || user.username;
}

export default function CalendarShareModal({ open, calendars, initialCalendarId, onClose, onChanged }: CalendarShareModalProps) {
  const [selectedCalendarId, setSelectedCalendarId] = useState("");
  const [members, setMembers] = useState<CalendarMemberItem[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchUserItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ownerCalendars = useMemo(() => calendars.filter((item) => item.role === "OWNER"), [calendars]);
  const memberIds = useMemo(() => new Set(members.map((member) => member.user.id)), [members]);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (initialCalendarId && ownerCalendars.some((calendar) => calendar.id === initialCalendarId)) {
      setSelectedCalendarId(initialCalendarId);
      return;
    }

    setSelectedCalendarId((current) => current || ownerCalendars[0]?.id || "");
  }, [initialCalendarId, open, ownerCalendars]);

  useEffect(() => {
    if (!open || !selectedCalendarId) {
      setMembers([]);
      return;
    }

    const loadMembers = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/calendars/${selectedCalendarId}/members`, { cache: "no-store" });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "No se pudieron cargar miembros");
        }

        setMembers((data.members || []) as CalendarMemberItem[]);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar miembros");
      } finally {
        setLoading(false);
      }
    };

    void loadMembers();
  }, [open, selectedCalendarId]);

  useEffect(() => {
    if (!open || !selectedCalendarId || query.trim().length < 2) {
      setResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      setSearching(true);
      try {
        const response = await fetch(`/api/social/users/search?q=${encodeURIComponent(query.trim())}&acceptedOnly=true`, {
          cache: "no-store",
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "No se pudo buscar usuarios");
        }

        setResults((data as SearchUserItem[]).filter((user) => !memberIds.has(user.id)));
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 250);

    return () => clearTimeout(timeout);
  }, [open, selectedCalendarId, query, memberIds]);

  if (!open) {
    return null;
  }

  const refreshMembers = async () => {
    if (!selectedCalendarId) {
      return;
    }

    const response = await fetch(`/api/calendars/${selectedCalendarId}/members`, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "No se pudieron cargar miembros");
    }

    setMembers((data.members || []) as CalendarMemberItem[]);
  };

  const invite = async (userId: string, role: "EDITOR" | "READER") => {
    if (!selectedCalendarId) {
      return;
    }

    setError(null);
    try {
      const response = await fetch(`/api/calendars/${selectedCalendarId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "No se pudo compartir");
      }

      setQuery("");
      setResults([]);
      await refreshMembers();
      await onChanged();
    } catch (inviteError) {
      setError(inviteError instanceof Error ? inviteError.message : "No se pudo compartir");
    }
  };

  const updateRole = async (userId: string, role: "EDITOR" | "READER") => {
    if (!selectedCalendarId) {
      return;
    }

    setError(null);
    try {
      const response = await fetch(`/api/calendars/${selectedCalendarId}/members/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "No se pudo actualizar rol");
      }

      await refreshMembers();
      await onChanged();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "No se pudo actualizar rol");
    }
  };

  const remove = async (userId: string) => {
    if (!selectedCalendarId) {
      return;
    }

    setError(null);
    try {
      const response = await fetch(`/api/calendars/${selectedCalendarId}/members/${userId}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "No se pudo revocar acceso");
      }

      await refreshMembers();
      await onChanged();
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "No se pudo revocar acceso");
    }
  };

  return (
    <div className="fixed inset-0 z-[140] bg-black/40 backdrop-blur-sm p-3 sm:p-4 flex items-center justify-center">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-hidden section-panel rounded-3xl p-0">
        <div className="px-5 py-4 border-b border-orion-border dark:border-orion-dark-border flex items-center justify-between gap-3">
          <h3 className="text-lg font-black text-slate-900 dark:text-white">Compartir calendarios</h3>
          <button type="button" className="btn-secondary px-3 py-1.5" onClick={onClose}>
            Cerrar
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto max-h-[calc(90vh-72px)]">
          {error ? <p className="text-sm text-red-500">{error}</p> : null}

          <select
            value={selectedCalendarId}
            onChange={(event) => setSelectedCalendarId(event.target.value)}
            className="select-orion"
          >
            <option value="">Selecciona calendario</option>
            {ownerCalendars.map((calendar) => (
              <option key={calendar.id} value={calendar.id}>
                {calendar.name}
              </option>
            ))}
          </select>

          <div>
            <p className="text-xs uppercase tracking-wider font-semibold text-slate-500 mb-2">Invitar conexion</p>
            <input
              className="input-orion"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por usuario"
            />
            {query.trim().length >= 2 ? (
              <div className="mt-2 rounded-lg border border-orion-border dark:border-orion-dark-border max-h-44 overflow-y-auto">
                {searching ? (
                  <p className="p-2 text-xs text-slate-400">Buscando...</p>
                ) : results.length === 0 ? (
                  <p className="p-2 text-xs text-slate-400">Sin resultados</p>
                ) : (
                  results.map((user) => (
                    <div key={user.id} className="p-2 flex items-center justify-between gap-2 border-b border-orion-border/60 dark:border-orion-dark-border/60">
                      <div>
                        <p className="text-sm text-slate-800 dark:text-slate-100">{fullName(user)}</p>
                        <p className="text-xs text-slate-500">@{user.username}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button type="button" className="btn-secondary px-2 py-1 text-xs" onClick={() => void invite(user.id, "READER")}>
                          Lector
                        </button>
                        <button type="button" className="btn-primary px-2 py-1 text-xs" onClick={() => void invite(user.id, "EDITOR")}>
                          Editor
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : null}
          </div>

          <div>
            <p className="text-xs uppercase tracking-wider font-semibold text-slate-500 mb-2">Miembros</p>
            <div className="rounded-lg border border-orion-border dark:border-orion-dark-border max-h-64 overflow-y-auto divide-y divide-orion-border dark:divide-orion-dark-border">
              {loading ? (
                <p className="p-3 text-xs text-slate-400">Cargando...</p>
              ) : members.length === 0 ? (
                <p className="p-3 text-xs text-slate-400">Sin miembros</p>
              ) : (
                members.map((member) => (
                  <div key={member.user.id} className="p-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{fullName(member.user)}</p>
                      <p className="text-xs text-slate-500">@{member.user.username}</p>
                    </div>

                    {member.role === "OWNER" ? (
                      <span className="text-xs uppercase text-slate-500">Propietario</span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <select
                          value={member.role}
                          onChange={(event) => void updateRole(member.user.id, event.target.value as "EDITOR" | "READER")}
                          className="select-orion !w-auto !py-1 !text-xs"
                        >
                          <option value="READER">Lector</option>
                          <option value="EDITOR">Editor</option>
                        </select>
                        <button type="button" className="text-xs text-red-500" onClick={() => void remove(member.user.id)}>
                          Quitar
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
