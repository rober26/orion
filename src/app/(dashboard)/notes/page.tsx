"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Archive,
  ArchiveRestore,
  Loader2,
  MoreHorizontal,
  Pin,
  PinOff,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";

type NoteColor = "#fef3c7" | "#bfdbfe" | "#bbf7d0" | "#fecaca" | "#ddd6fe" | "#fed7aa";

interface QuickNote {
  id: string;
  title: string;
  content: string;
  color: string;
  isPinned: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

const NOTE_COLORS: NoteColor[] = ["#fef3c7", "#bfdbfe", "#bbf7d0", "#fecaca", "#ddd6fe", "#fed7aa"];

const VIEW_FILTERS = [
  { id: "active", label: "Activas" },
  { id: "archived", label: "Archivadas" },
] as const;

type ViewFilter = (typeof VIEW_FILTERS)[number]["id"];

export default function NotesPage() {
  const [notes, setNotes] = useState<QuickNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingQuickNote, setSavingQuickNote] = useState(false);
  const [editingNote, setEditingNote] = useState<QuickNote | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ViewFilter>("active");
  const [error, setError] = useState<string | null>(null);
  const [quickTitle, setQuickTitle] = useState("");
  const [quickContent, setQuickContent] = useState("");
  const [quickColor, setQuickColor] = useState<NoteColor>("#fef3c7");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const loadNotes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const query = new URLSearchParams();
      query.set("archived", String(filter === "archived"));
      if (search.trim()) {
        query.set("q", search.trim());
      }

      const response = await fetch(`/api/notes?${query.toString()}`, { cache: "no-store" });
      const payload = (await response.json()) as QuickNote[] | { error?: string };

      if (!response.ok) {
        throw new Error((payload as { error?: string }).error || "No se pudieron cargar notas");
      }

      setNotes(Array.isArray(payload) ? payload : []);
    } catch (fetchError) {
      const message = fetchError instanceof Error ? fetchError.message : "No se pudieron cargar notas";
      setError(message);
      setNotes([]);
    } finally {
      setLoading(false);
    }
  }, [filter, search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadNotes();
    }, 170);

    return () => clearTimeout(timer);
  }, [loadNotes]);

  useEffect(() => {
    const onGlobalPointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("[data-note-menu='true']")) {
        return;
      }
      setOpenMenuId(null);
    };

    window.addEventListener("pointerdown", onGlobalPointerDown);
    return () => window.removeEventListener("pointerdown", onGlobalPointerDown);
  }, []);

  const createQuickNote = async () => {
    const title = quickTitle.trim();
    const content = quickContent.trim();

    if (!title && !content) {
      return;
    }

    try {
      setSavingQuickNote(true);
      setError(null);

      const response = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          content,
          color: quickColor,
        }),
      });

      const payload = (await response.json()) as QuickNote | { error?: string };
      if (!response.ok) {
        throw new Error((payload as { error?: string }).error || "No se pudo crear la nota");
      }

      const created = payload as QuickNote;
      setQuickTitle("");
      setQuickContent("");
      if (filter === "active") {
        setNotes((prev) => [created, ...prev]);
      } else {
        await loadNotes();
      }
    } catch (createError) {
      const message = createError instanceof Error ? createError.message : "No se pudo crear la nota";
      setError(message);
    } finally {
      setSavingQuickNote(false);
    }
  };

  const updateNote = useCallback(async (id: string, patch: Partial<QuickNote>) => {
    try {
      setUpdatingId(id);
      setError(null);

      const response = await fetch(`/api/notes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });

      const payload = (await response.json()) as QuickNote | { error?: string };

      if (!response.ok) {
        throw new Error((payload as { error?: string }).error || "No se pudo actualizar la nota");
      }

      const updated = payload as QuickNote;

      if ((patch.isArchived === true && filter === "active") || (patch.isArchived === false && filter === "archived")) {
        setNotes((prev) => prev.filter((item) => item.id !== id));
      } else {
        setNotes((prev) => {
          const next = prev.map((item) => (item.id === id ? updated : item));
          return next.sort((a, b) => {
            if (a.isPinned !== b.isPinned) {
              return a.isPinned ? -1 : 1;
            }
            return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
          });
        });
      }

      setEditingNote((prev) => (prev && prev.id === id ? updated : prev));
    } catch (updateError) {
      const message = updateError instanceof Error ? updateError.message : "No se pudo actualizar la nota";
      setError(message);
    } finally {
      setUpdatingId(null);
    }
  }, [filter]);

  const deleteNote = useCallback(async (id: string) => {
    try {
      setUpdatingId(id);
      setError(null);

      const response = await fetch(`/api/notes/${id}`, { method: "DELETE" });
      const payload = (await response.json()) as { ok?: boolean; error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "No se pudo eliminar la nota");
      }

      setNotes((prev) => prev.filter((item) => item.id !== id));
      setEditingNote((prev) => (prev?.id === id ? null : prev));
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : "No se pudo eliminar la nota";
      setError(message);
    } finally {
      setUpdatingId(null);
    }
  }, []);

  return (
    <div className="app-page">
      <div className="app-page-content">
        <section className="page-head bg-gradient-to-r from-amber-300/65 via-orange-200/70 to-yellow-100 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
          <div className="flex flex-col gap-2">
            <h1 className="page-title">Notas</h1>
            <p className="page-subtitle">Captura ideas, organiza pendientes y recupera contexto rapido.</p>
          </div>
        </section>

        <section className="section-panel space-y-3">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-3">
            <div className="space-y-2">
              <input
                type="text"
                value={quickTitle}
                onChange={(event) => setQuickTitle(event.target.value)}
                placeholder="Titulo rapido"
                className="input-orion"
                maxLength={120}
              />
              <textarea
                value={quickContent}
                onChange={(event) => setQuickContent(event.target.value)}
                placeholder="Que necesitas recordar?"
                className="input-orion min-h-24 resize-none"
                maxLength={10000}
              />
            </div>

            <div className="flex flex-col gap-3 lg:min-w-[210px]">
              <div className="rounded-xl border border-orion-border dark:border-orion-dark-border p-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Color</p>
                <div className="grid grid-cols-6 lg:grid-cols-3 gap-2">
                  {NOTE_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setQuickColor(color)}
                      className={`h-8 w-8 rounded-lg border transition-transform hover:scale-105 ${
                        quickColor === color ? "border-slate-900 dark:border-white" : "border-black/10"
                      }`}
                      style={{ backgroundColor: color }}
                      aria-label={`Color ${color}`}
                    />
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => void createQuickNote()}
                disabled={savingQuickNote}
                className="btn-primary h-11 rounded-xl font-bold disabled:cursor-not-allowed"
              >
                {savingQuickNote ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 size={16} className="animate-spin" /> Guardando...
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    <Plus size={16} /> Crear nota
                  </span>
                )}
              </button>
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {VIEW_FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilter(item.id)}
                className={`filter-chip ${
                  filter === item.id
                    ? "bg-orion-primary text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <label className="relative block w-full sm:w-[360px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por titulo o contenido"
              className="input-orion pl-9"
            />
          </label>
        </section>

        {error ? (
          <div className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-600 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="h-44 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
            ))}
          </div>
        ) : notes.length === 0 ? (
          <div className="rounded-3xl border-2 border-dashed border-orion-border px-6 py-16 text-center dark:border-orion-dark-border">
            <p className="text-slate-500 font-medium">Aun no hay notas en esta vista.</p>
          </div>
        ) : (
          <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-3 [column-fill:_balance]">
            {notes.map((note) => (
               <article
                 key={note.id}
                 className="mb-3 break-inside-avoid rounded-3xl border border-black/10 p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                 style={{ backgroundColor: note.color }}
               >
                <div className="mb-2 flex items-start gap-2">
                  <button
                    type="button"
                    onClick={() => void updateNote(note.id, { isPinned: !note.isPinned })}
                    disabled={updatingId === note.id || note.isArchived}
                    className="rounded-lg p-1 text-slate-700/80 hover:bg-black/5 disabled:opacity-40"
                    title={note.isPinned ? "Desfijar" : "Fijar"}
                  >
                    {note.isPinned ? <Pin size={14} /> : <PinOff size={14} />}
                  </button>

                  <h3
                    onClick={() => setEditingNote(note)}
                    className="flex-1 cursor-pointer text-sm font-extrabold text-slate-900 leading-tight"
                  >
                    {note.title || "Nota sin titulo"}
                  </h3>

                  <div className="relative" data-note-menu="true">
                    <button
                      type="button"
                      onClick={() => setOpenMenuId((prev) => (prev === note.id ? null : note.id))}
                      className="rounded-lg p-1 text-slate-700/80 hover:bg-black/5"
                    >
                      <MoreHorizontal size={14} />
                    </button>

                    {openMenuId === note.id ? (
                      <div className="absolute right-0 top-full z-20 mt-1 w-40 overflow-hidden rounded-xl border border-black/10 bg-white shadow-xl">
                        <button
                          type="button"
                          onClick={() => {
                            setOpenMenuId(null);
                            void updateNote(note.id, { isArchived: !note.isArchived });
                          }}
                          className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100"
                        >
                          {note.isArchived ? "Restaurar" : "Archivar"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setOpenMenuId(null);
                            void deleteNote(note.id);
                          }}
                          className="w-full px-3 py-2 text-left text-xs font-semibold text-red-600 hover:bg-red-50"
                        >
                          Eliminar
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setEditingNote(note)}
                  className="w-full text-left"
                >
                  <p className="whitespace-pre-wrap text-sm text-slate-700 leading-relaxed line-clamp-8 min-h-12">
                    {note.content || "(Sin contenido)"}
                  </p>
                </button>

                <div className="mt-3 flex items-center justify-between text-[11px] font-semibold text-slate-600">
                  <span>{new Date(note.updatedAt).toLocaleDateString()}</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => void updateNote(note.id, { isArchived: !note.isArchived })}
                      disabled={updatingId === note.id}
                      className="rounded-lg p-1 hover:bg-black/5 disabled:opacity-40"
                      title={note.isArchived ? "Restaurar" : "Archivar"}
                    >
                      {note.isArchived ? <ArchiveRestore size={13} /> : <Archive size={13} />}
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteNote(note.id)}
                      disabled={updatingId === note.id}
                      className="rounded-lg p-1 hover:bg-black/5 disabled:opacity-40"
                      title="Eliminar"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {editingNote ? (
        <EditNoteModal
          note={editingNote}
          busy={updatingId === editingNote.id}
          onClose={() => setEditingNote(null)}
          onDelete={async () => {
            await deleteNote(editingNote.id);
          }}
          onSave={async (patch) => {
            await updateNote(editingNote.id, patch);
          }}
        />
      ) : null}
    </div>
  );
}

function EditNoteModal({
  note,
  busy,
  onClose,
  onDelete,
  onSave,
}: {
  note: QuickNote;
  busy: boolean;
  onClose: () => void;
  onDelete: () => Promise<void>;
  onSave: (patch: Partial<QuickNote>) => Promise<void>;
}) {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [color, setColor] = useState(note.color);

  useEffect(() => {
    setTitle(note.title);
    setContent(note.content);
    setColor(note.color);
  }, [note]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-3xl border border-black/10 shadow-2xl" style={{ backgroundColor: color }}>
        <div className="flex items-center justify-between gap-3 border-b border-black/10 px-5 py-4">
          <h2 className="text-lg font-black text-slate-900">Editar nota</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1 hover:bg-black/5" aria-label="Cerrar">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Titulo"
            className="w-full rounded-xl border border-black/10 bg-white/70 px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-orion-primary/40"
            maxLength={120}
          />
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="Contenido"
            className="w-full min-h-52 resize-none rounded-xl border border-black/10 bg-white/70 px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-orion-primary/40"
            maxLength={10000}
          />

          <div className="flex flex-wrap items-center gap-2">
            {NOTE_COLORS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setColor(item)}
                className={`h-8 w-8 rounded-lg border transition-transform hover:scale-105 ${
                  color === item ? "border-slate-900" : "border-black/10"
                }`}
                style={{ backgroundColor: item }}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-black/10 px-5 py-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void onSave({ isPinned: !note.isPinned })}
              disabled={busy}
              className="rounded-xl border border-black/10 bg-white/70 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-white"
            >
              {note.isPinned ? "Desfijar" : "Fijar"}
            </button>
            <button
              type="button"
              onClick={() => void onSave({ isArchived: !note.isArchived })}
              disabled={busy}
              className="rounded-xl border border-black/10 bg-white/70 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-white"
            >
              {note.isArchived ? "Restaurar" : "Archivar"}
            </button>
            <button
              type="button"
              onClick={() => void onDelete()}
              disabled={busy}
              className="rounded-xl border border-red-200 bg-red-600 px-3 py-2 text-xs font-bold text-white hover:bg-red-700"
            >
              Eliminar
            </button>
          </div>

          <button
            type="button"
            onClick={() => void onSave({ title: title.trim(), content, color })}
            disabled={busy}
            className="btn-primary rounded-xl px-4 py-2 text-sm font-bold"
          >
            {busy ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" /> Guardando...
              </span>
            ) : (
              "Guardar cambios"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
