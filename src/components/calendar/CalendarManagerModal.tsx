"use client";

import { useMemo, useState } from "react";
import type { UserCalendarItem } from "@/src/components/calendar/types";

interface CalendarManagerModalProps {
  open: boolean;
  calendars: UserCalendarItem[];
  onClose: () => void;
  onChanged: () => Promise<void>;
}

interface CalendarFormState {
  name: string;
  color: string;
  visibility: "PUBLIC" | "PRIVATE";
}

const DEFAULT_COLOR = "#2563eb";

export default function CalendarManagerModal({ open, calendars, onClose, onChanged }: CalendarManagerModalProps) {
  const [selectedId, setSelectedId] = useState<string>("");
  const [creating, setCreating] = useState<CalendarFormState>({ name: "", color: DEFAULT_COLOR, visibility: "PRIVATE" });
  const [editing, setEditing] = useState<CalendarFormState>({ name: "", color: DEFAULT_COLOR, visibility: "PRIVATE" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const ownedCalendars = useMemo(() => calendars.filter((calendar) => calendar.role === "OWNER"), [calendars]);
  const selectedCalendar = useMemo(
    () => ownedCalendars.find((calendar) => calendar.id === selectedId) || null,
    [ownedCalendars, selectedId],
  );

  if (!open) {
    return null;
  }

  const openEditorFor = (calendar: UserCalendarItem) => {
    setSelectedId(calendar.id);
    setEditing({
      name: calendar.name,
      color: calendar.color || DEFAULT_COLOR,
      visibility: calendar.visibility,
    });
    setError(null);
  };

  const createCalendar = async () => {
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/calendars", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(creating),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "No se pudo crear el calendario");
      }

      setCreating({ name: "", color: DEFAULT_COLOR, visibility: "PRIVATE" });
      await onChanged();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "No se pudo crear el calendario");
    } finally {
      setLoading(false);
    }
  };

  const saveSelectedCalendar = async () => {
    if (!selectedCalendar) {
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const response = await fetch(`/api/calendars/${selectedCalendar.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "No se pudo actualizar el calendario");
      }

      await onChanged();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No se pudo actualizar el calendario");
    } finally {
      setLoading(false);
    }
  };

  const removeSelectedCalendar = async () => {
    if (!selectedCalendar || selectedCalendar.isDefault) {
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const response = await fetch(`/api/calendars/${selectedCalendar.id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "No se pudo eliminar el calendario");
      }

      setSelectedId("");
      setEditing({ name: "", color: DEFAULT_COLOR, visibility: "PRIVATE" });
      await onChanged();
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "No se pudo eliminar el calendario");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[145] bg-black/45 backdrop-blur-sm p-3 sm:p-4 flex items-center justify-center">
      <div className="w-full max-w-3xl max-h-[92vh] overflow-hidden section-panel rounded-3xl p-0">
        <div className="px-5 py-4 border-b border-orion-border dark:border-orion-dark-border flex items-center justify-between gap-3">
          <h3 className="text-lg font-black text-slate-900 dark:text-white">Gestionar calendarios</h3>
          <button type="button" className="btn-secondary px-3 py-1.5" onClick={onClose}>
            Cerrar
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4 p-4 sm:p-5 overflow-y-auto max-h-[calc(92vh-72px)]">
          <aside className="space-y-2 max-h-[240px] lg:max-h-[420px] overflow-y-auto">
            {ownedCalendars.map((calendar) => (
              <button
                key={calendar.id}
                type="button"
                onClick={() => openEditorFor(calendar)}
                className={`w-full text-left rounded-xl border px-3 py-2 transition-colors ${
                  selectedCalendar?.id === calendar.id
                    ? "border-cyan-500 bg-cyan-50 dark:bg-cyan-950/30"
                    : "border-orion-border dark:border-orion-dark-border hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: calendar.color || DEFAULT_COLOR }} />
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{calendar.name}</span>
                </div>
                <p className="text-[10px] uppercase text-slate-500 mt-1">
                  {calendar.visibility} {calendar.isDefault ? "· por defecto" : ""}
                </p>
              </button>
            ))}
          </aside>

          <section className="space-y-5">
            {error ? <p className="text-sm text-red-500">{error}</p> : null}

            <div className="rounded-xl border border-orion-border dark:border-orion-dark-border p-4 space-y-3">
              <h4 className="text-sm font-black uppercase tracking-wider text-slate-500">Nuevo calendario</h4>
              <input
                className="input-orion"
                placeholder="Nombre"
                value={creating.name}
                onChange={(event) => setCreating((prev) => ({ ...prev, name: event.target.value }))}
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  className="input-orion"
                  type="color"
                  value={creating.color}
                  onChange={(event) => setCreating((prev) => ({ ...prev, color: event.target.value }))}
                />
                <select
                  className="select-orion"
                  value={creating.visibility}
                  onChange={(event) => setCreating((prev) => ({ ...prev, visibility: event.target.value as "PUBLIC" | "PRIVATE" }))}
                >
                  <option value="PRIVATE">Privado</option>
                  <option value="PUBLIC">Publico</option>
                </select>
              </div>
              <button type="button" className="btn-primary" disabled={loading} onClick={() => void createCalendar()}>
                Crear calendario
              </button>
            </div>

            {selectedCalendar ? (
              <div className="rounded-xl border border-orion-border dark:border-orion-dark-border p-4 space-y-3">
                <h4 className="text-sm font-black uppercase tracking-wider text-slate-500">Editar calendario</h4>
                <input
                  className="input-orion"
                  placeholder="Nombre"
                  value={editing.name}
                  onChange={(event) => setEditing((prev) => ({ ...prev, name: event.target.value }))}
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    className="input-orion"
                    type="color"
                    value={editing.color}
                    onChange={(event) => setEditing((prev) => ({ ...prev, color: event.target.value }))}
                  />
                  <select
                    className="select-orion"
                    value={editing.visibility}
                    onChange={(event) => setEditing((prev) => ({ ...prev, visibility: event.target.value as "PUBLIC" | "PRIVATE" }))}
                  >
                    <option value="PRIVATE">Privado</option>
                    <option value="PUBLIC">Publico</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" className="btn-primary" disabled={loading} onClick={() => void saveSelectedCalendar()}>
                    Guardar cambios
                  </button>
                  {!selectedCalendar.isDefault ? (
                    <button type="button" className="btn-secondary border-red-300 text-red-500" disabled={loading} onClick={() => void removeSelectedCalendar()}>
                      Eliminar calendario
                    </button>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-orion-border dark:border-orion-dark-border p-5 text-sm text-slate-500">
                Selecciona un calendario para editarlo.
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
