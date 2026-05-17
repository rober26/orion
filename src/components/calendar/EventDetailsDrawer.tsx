"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, UserMinus, UserPlus } from "lucide-react";
import type { CalendarAttendeeItem, CalendarEventItem } from "@/src/components/calendar/types";

interface SearchUserItem {
  id: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
}

interface EventDetailsDrawerProps {
  open: boolean;
  event: CalendarEventItem | null;
  onClose: () => void;
  onRefresh: () => Promise<void>;
  onEdit: (event: CalendarEventItem) => void;
}

function fullName(user: SearchUserItem | CalendarAttendeeItem["user"]): string {
  const value = `${user.firstName || ""} ${user.lastName || ""}`.trim();
  return value || user.username;
}

export default function EventDetailsDrawer({ open, event, onClose, onRefresh, onEdit }: EventDetailsDrawerProps) {
  const [attendees, setAttendees] = useState<CalendarAttendeeItem[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchUserItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);

  const attendeeIds = useMemo(() => new Set(attendees.map((attendee) => attendee.user.id)), [attendees]);

  const loadAttendees = useCallback(async () => {
    if (!event || event.sourceType !== "event") {
      setAttendees([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/calendar/events/${event.id}/attendees`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "No se pudieron cargar los asistentes");
      }
      setAttendees((data.attendees || []) as CalendarAttendeeItem[]);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar los asistentes");
    } finally {
      setLoading(false);
    }
  }, [event]);

  useEffect(() => {
    if (!open || !event || event.sourceType !== "event") {
      setAttendees([]);
      setQuery("");
      setResults([]);
      setError(null);
      return;
    }

    void loadAttendees();
  }, [open, event, loadAttendees]);

  useEffect(() => {
    if (!open || !event || event.sourceType !== "event" || query.trim().length < 2) {
      setResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      setSearching(true);
      try {
        const response = await fetch(`/api/social/users/search?q=${encodeURIComponent(query.trim())}&acceptedOnly=true`);
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "No se pudo buscar usuarios");
        }

        setResults((data as SearchUserItem[]).filter((user) => !attendeeIds.has(user.id)));
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [open, query, attendeeIds, event]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const media = window.matchMedia("(min-width: 1024px)");
    const sync = () => setIsDesktop(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  if (!open || !event) {
    return null;
  }

  const invite = async (userId: string) => {
    if (event.sourceType !== "event") {
      return;
    }

    try {
      const response = await fetch(`/api/calendar/events/${event.id}/attendees`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "No se pudo invitar");
      }

      setQuery("");
      setResults([]);
      await loadAttendees();
      await onRefresh();
    } catch (inviteError) {
      setError(inviteError instanceof Error ? inviteError.message : "No se pudo invitar");
    }
  };

  const remove = async (userId: string) => {
    if (event.sourceType !== "event") {
      return;
    }

    try {
      const response = await fetch(`/api/calendar/events/${event.id}/attendees/${userId}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "No se pudo remover");
      }

      await loadAttendees();
      await onRefresh();
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "No se pudo remover");
    }
  };

  const deleteEvent = async () => {
    if (event.sourceType !== "event") {
      return;
    }

    try {
      const response = await fetch(`/api/calendar/events/${event.id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "No se pudo eliminar");
      }

      await onRefresh();
      onClose();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "No se pudo eliminar");
    }
  };

  return (
    <div className="fixed inset-0 z-[105] bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <aside
        className={`bg-white dark:bg-slate-900 border-orion-border dark:border-orion-dark-border overflow-y-auto ${
          isDesktop
            ? "absolute right-4 top-20 w-[420px] max-h-[calc(100vh-6.5rem)] rounded-2xl border shadow-2xl p-4"
            : "absolute right-0 top-0 h-full w-full max-w-md border-l p-4 sm:p-5"
        }`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2 mb-4">
          <div className="min-w-0">
            <p className="text-[10px] text-orion-primary uppercase tracking-wider font-black">{event.sourceType}</p>
            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white truncate">{event.title}</h3>
            <p className="text-xs text-slate-500 truncate">{event.calendarName || event.projectName || "Sin fuente"}</p>
          </div>
          <button type="button" className="btn-secondary px-2 py-1" onClick={onClose}>
            Cerrar
          </button>
        </div>

        <div className="grid grid-cols-1 gap-2 mb-4">
          <div className="rounded-xl border border-orion-border dark:border-orion-dark-border px-3 py-2 text-sm text-slate-600 dark:text-slate-300">
            <p className="text-[10px] uppercase tracking-wide text-slate-500">Inicio</p>
            <p className="font-semibold text-slate-800 dark:text-slate-100">{new Date(event.start).toLocaleString()}</p>
          </div>
          <div className="rounded-xl border border-orion-border dark:border-orion-dark-border px-3 py-2 text-sm text-slate-600 dark:text-slate-300">
            <p className="text-[10px] uppercase tracking-wide text-slate-500">Fin</p>
            <p className="font-semibold text-slate-800 dark:text-slate-100">{new Date(event.end).toLocaleString()}</p>
          </div>
          {event.location ? (
            <div className="rounded-xl border border-orion-border dark:border-orion-dark-border px-3 py-2 text-sm text-slate-600 dark:text-slate-300">
              <p className="text-[10px] uppercase tracking-wide text-slate-500">Ubicacion</p>
              <p className="font-semibold text-slate-800 dark:text-slate-100">{event.location}</p>
            </div>
          ) : null}
          {event.description ? (
            <div className="rounded-xl border border-orion-border dark:border-orion-dark-border px-3 py-2 text-sm text-slate-600 dark:text-slate-300">
              <p className="text-[10px] uppercase tracking-wide text-slate-500">Descripcion</p>
              <p className="text-slate-700 dark:text-slate-200 whitespace-pre-wrap">{event.description}</p>
            </div>
          ) : null}
        </div>

        {error ? <p className="text-sm text-red-500 mb-3">{error}</p> : null}

        {event.sourceType === "event" ? (
          <>
            {!event.isReadOnly ? (
              <div className="flex gap-2 mb-4">
                <button type="button" className="btn-primary" onClick={() => onEdit(event)}>
                  Editar
                </button>
                <button type="button" className="btn-secondary border-red-300 text-red-500" onClick={() => void deleteEvent()}>
                  Eliminar
                </button>
              </div>
            ) : null}

            <div className="mb-3">
              <p className="text-xs uppercase tracking-wide font-semibold text-slate-500 mb-2">Asistentes</p>
              {loading ? (
                <p className="text-sm text-slate-400 inline-flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin" /> Cargando...
                </p>
              ) : attendees.length === 0 ? (
                <p className="text-sm text-slate-400">Sin asistentes.</p>
              ) : (
                <div className="space-y-2">
                  {attendees.map((attendee) => (
                    <div
                      key={attendee.user.id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-orion-border dark:border-orion-dark-border px-2 py-2"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{fullName(attendee.user)}</p>
                        <p className="text-xs text-slate-500">@{attendee.user.username}</p>
                      </div>
                      {!event.isReadOnly ? (
                        <button
                          type="button"
                          className="text-xs text-red-500 inline-flex items-center gap-1"
                          onClick={() => void remove(attendee.user.id)}
                        >
                          <UserMinus size={12} /> Quitar
                        </button>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {!event.isReadOnly ? (
              <div>
                <p className="text-xs uppercase tracking-wide font-semibold text-slate-500 mb-2">Invitar conexion</p>
                <input
                  className="input-orion"
                  placeholder="Buscar conexiones aceptadas"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                {query.trim().length >= 2 ? (
                  <div className="mt-2 border border-orion-border dark:border-orion-dark-border rounded-lg max-h-44 overflow-y-auto">
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
                          <button
                            type="button"
                            className="text-xs text-orion-primary inline-flex items-center gap-1"
                            onClick={() => void invite(user.id)}
                          >
                            <UserPlus size={12} /> Invitar
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                ) : null}
              </div>
            ) : null}
          </>
        ) : (
          <p className="text-sm text-slate-500">Este elemento proviene de {event.sourceType} y es de solo lectura en calendario.</p>
        )}
      </aside>
    </div>
  );
}
