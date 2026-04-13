"use client";

import { useEffect, useMemo, useState } from "react";
import type { CalendarEventItem, CalendarProjectItem, EventTimeMode } from "@/src/components/calendar/types";

interface EventModalProps {
  open: boolean;
  projects: CalendarProjectItem[];
  initialDate: Date;
  editingEvent: CalendarEventItem | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}

function toLocalDatetimeInputValue(date: Date): string {
  const timezoneOffset = date.getTimezoneOffset() * 60000;
  const local = new Date(date.getTime() - timezoneOffset);
  return local.toISOString().slice(0, 16);
}

function fromLocalDatetimeInputValue(value: string): string {
  return new Date(value).toISOString();
}

function toLocalDateInputValue(date: Date): string {
  const timezoneOffset = date.getTimezoneOffset() * 60000;
  const local = new Date(date.getTime() - timezoneOffset);
  return local.toISOString().slice(0, 10);
}

function mergeDateAndTimeToIso(dateValue: string, timeValue: string): string {
  return new Date(`${dateValue}T${timeValue}`).toISOString();
}

export default function EventModal({ open, projects, initialDate, editingEvent, onClose, onSaved }: EventModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [projectId, setProjectId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [dayOnlyDate, setDayOnlyDate] = useState("");
  const [singleTimeValue, setSingleTimeValue] = useState("09:00");
  const [isAllDay, setIsAllDay] = useState(false);
  const [timeMode, setTimeMode] = useState<EventTimeMode>("range");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const defaultProjectId = useMemo(() => projects[0]?.id ?? "", [projects]);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (editingEvent) {
      const start = new Date(editingEvent.start);
      const end = new Date(editingEvent.end);
      const durationMs = end.getTime() - start.getTime();
      const detectedMode: EventTimeMode = editingEvent.allDay
        ? "all-day"
        : durationMs === 0
          ? "single"
          : "range";

      setTitle(editingEvent.title);
      setDescription(editingEvent.description || "");
      setLocation(editingEvent.location || "");
      setProjectId(editingEvent.projectId);
      setStartDate(toLocalDatetimeInputValue(start));
      setEndDate(toLocalDatetimeInputValue(end));
      setDayOnlyDate(toLocalDateInputValue(start));
      setSingleTimeValue(toLocalDatetimeInputValue(start).slice(11, 16));
      setIsAllDay(editingEvent.allDay);
      setTimeMode(detectedMode);
      setError(null);
      return;
    }

    const start = new Date(initialDate);
    start.setMinutes(0, 0, 0);
    const end = new Date(start);
    end.setHours(end.getHours() + 1);

    setTitle("");
    setDescription("");
    setLocation("");
    setProjectId(defaultProjectId);
    setStartDate(toLocalDatetimeInputValue(start));
    setEndDate(toLocalDatetimeInputValue(end));
    setDayOnlyDate(toLocalDateInputValue(start));
    setSingleTimeValue("09:00");
    setIsAllDay(false);
    setTimeMode("range");
    setError(null);
  }, [open, initialDate, editingEvent, defaultProjectId]);

  useEffect(() => {
    if (timeMode === "all-day") {
      setIsAllDay(true);
      return;
    }

    setIsAllDay(false);
  }, [timeMode]);

  if (!open) {
    return null;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!title.trim()) {
        throw new Error("El titulo es obligatorio");
      }

      if (!projectId) {
        throw new Error("Selecciona un proyecto");
      }

      let finalStart = fromLocalDatetimeInputValue(startDate);
      let finalEnd = fromLocalDatetimeInputValue(endDate);

      if (timeMode === "all-day") {
        finalStart = new Date(`${dayOnlyDate}T00:00:00`).toISOString();
        finalEnd = new Date(`${dayOnlyDate}T23:59:59`).toISOString();
      } else if (timeMode === "single") {
        finalStart = mergeDateAndTimeToIso(dayOnlyDate, singleTimeValue);
        finalEnd = finalStart;
      }

      const payload = {
        title: title.trim(),
        description: description.trim(),
        location: location.trim(),
        projectId,
        startDate: finalStart,
        endDate: finalEnd,
        isAllDay,
      };

      const endpoint = editingEvent ? `/api/calendar/events/${editingEvent.id}` : "/api/calendar/events";
      const method = editingEvent ? "PATCH" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "No se pudo guardar el evento");
      }

      await onSaved();
      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo guardar el evento");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <form
        onSubmit={(event) => void handleSubmit(event)}
        className="w-full max-w-xl rounded-2xl border border-orion-border dark:border-orion-dark-border bg-white dark:bg-slate-900 shadow-2xl"
      >
        <div className="px-5 py-4 border-b border-orion-border dark:border-orion-dark-border flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">{editingEvent ? "Editar evento" : "Nuevo evento"}</h3>
          <button type="button" onClick={onClose} className="btn-secondary px-3 py-1.5">
            Cerrar
          </button>
        </div>

        <div className="p-5 space-y-3">
          {error ? <p className="text-sm text-red-500">{error}</p> : null}

          <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Titulo" className="input-orion" />
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Descripcion"
            rows={3}
            className="input-orion"
          />
          <input
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            placeholder="Ubicacion"
            className="input-orion"
          />

          <select value={projectId} onChange={(event) => setProjectId(event.target.value)} className="select-orion">
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setTimeMode("range")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                timeMode === "range"
                  ? "bg-orion-primary text-white border-orion-primary"
                  : "border-orion-border dark:border-orion-dark-border text-slate-600 dark:text-slate-300"
              }`}
            >
              Tramo
            </button>
            <button
              type="button"
              onClick={() => setTimeMode("single")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                timeMode === "single"
                  ? "bg-orion-primary text-white border-orion-primary"
                  : "border-orion-border dark:border-orion-dark-border text-slate-600 dark:text-slate-300"
              }`}
            >
              Hora puntual
            </button>
            <button
              type="button"
              onClick={() => setTimeMode("all-day")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                timeMode === "all-day"
                  ? "bg-orion-primary text-white border-orion-primary"
                  : "border-orion-border dark:border-orion-dark-border text-slate-600 dark:text-slate-300"
              }`}
            >
              Todo el dia
            </button>
          </div>

          {timeMode === "range" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-slate-500 mb-1">Inicio</p>
                <input
                  type="datetime-local"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  className="input-orion"
                />
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Fin</p>
                <input
                  type="datetime-local"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                  className="input-orion"
                />
              </div>
            </div>
          ) : null}

          {timeMode === "single" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-slate-500 mb-1">Fecha</p>
                <input
                  type="date"
                  value={dayOnlyDate}
                  onChange={(event) => setDayOnlyDate(event.target.value)}
                  className="input-orion"
                />
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Hora</p>
                <input
                  type="time"
                  value={singleTimeValue}
                  onChange={(event) => setSingleTimeValue(event.target.value)}
                  className="input-orion"
                />
              </div>
            </div>
          ) : null}

          {timeMode === "all-day" ? (
            <div>
              <p className="text-xs text-slate-500 mb-1">Dia</p>
              <input
                type="date"
                value={dayOnlyDate}
                onChange={(event) => setDayOnlyDate(event.target.value)}
                className="input-orion"
              />
            </div>
          ) : null}
        </div>

        <div className="px-5 py-4 border-t border-orion-border dark:border-orion-dark-border flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancelar
          </button>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Guardando..." : editingEvent ? "Guardar cambios" : "Crear evento"}
          </button>
        </div>
      </form>
    </div>
  );
}
