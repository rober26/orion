"use client";

import { use, useEffect, useState } from "react";
import { Loader2, Pencil, StickyNote, Trash2, X } from "lucide-react";
import ProjectSidebar from "@/src/components/projects/ProjectSidebar";

interface QuickNoteItem {
  id: string;
  title: string;
  content: string;
  color: string;
  updatedAt: string;
}

interface ProjectPermissionsResponse {
  permissions?: {
    canEdit?: boolean;
  };
  error?: string;
}

export default function ProjectNotesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [notes, setNotes] = useState<QuickNoteItem[]>([]);
  const [notesLoading, setNotesLoading] = useState(true);
  const [notesError, setNotesError] = useState<string | null>(null);
  const [canEdit, setCanEdit] = useState(false);

  const [editingNote, setEditingNote] = useState<QuickNoteItem | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingContent, setEditingContent] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setNotesLoading(true);
        setNotesError(null);

        const query = new URLSearchParams();
        query.set("archived", "false");
        query.set("projectId", id);

        const [notesRes, projectRes] = await Promise.all([
          fetch(`/api/notes?${query.toString()}`, { cache: "no-store" }),
          fetch(`/api/projects/${id}`, { cache: "no-store" }),
        ]);

        const notesPayload = (await notesRes.json()) as QuickNoteItem[] | { error?: string };
        const projectPayload = (await projectRes.json()) as ProjectPermissionsResponse;

        if (!notesRes.ok) {
          throw new Error((notesPayload as { error?: string }).error || "No se pudieron cargar notas");
        }

        if (!projectRes.ok) {
          throw new Error(projectPayload.error || "No se pudieron cargar permisos");
        }

        setCanEdit(Boolean(projectPayload.permissions?.canEdit));
        setNotes(Array.isArray(notesPayload) ? notesPayload : []);
      } catch (error) {
        const message = error instanceof Error ? error.message : "No se pudieron cargar notas";
        setNotesError(message);
        setNotes([]);
      } finally {
        setNotesLoading(false);
      }
    };

    void load();
  }, [id]);

  const openEdit = (note: QuickNoteItem) => {
    setEditingNote(note);
    setEditingTitle(note.title || "");
    setEditingContent(note.content || "");
  };

  const saveEdited = async () => {
    if (!editingNote || savingNote) {
      return;
    }

    try {
      setSavingNote(true);
      const response = await fetch(`/api/notes/${editingNote.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editingTitle.slice(0, 120),
          content: editingContent.slice(0, 10000),
          projectId: id,
        }),
      });

      const payload = (await response.json()) as QuickNoteItem | { error?: string };
      if (!response.ok || !("id" in payload)) {
        throw new Error((payload as { error?: string }).error || "No se pudo guardar la nota");
      }

      const updated = payload as QuickNoteItem;
      setNotes((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setEditingNote(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo guardar la nota";
      setNotesError(message);
    } finally {
      setSavingNote(false);
    }
  };

  const deleteNote = async (noteId: string) => {
    if (deletingNoteId === noteId) {
      return;
    }

    try {
      setDeletingNoteId(noteId);
      const response = await fetch(`/api/notes/${noteId}`, { method: "DELETE" });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "No se pudo eliminar la nota");
      }

      setNotes((prev) => prev.filter((item) => item.id !== noteId));
      if (editingNote?.id === noteId) {
        setEditingNote(null);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo eliminar la nota";
      setNotesError(message);
    } finally {
      setDeletingNoteId(null);
    }
  };

  return (
    <div className="flex h-full rounded-[1rem] bg-orion-surface dark:bg-slate-950 overflow-hidden">
      <ProjectSidebar />

      <main className="app-workspace-main">
        <section className="section-panel-compact">
          <div className="mb-4 flex items-center gap-2">
            <StickyNote size={18} className="text-orion-primary" />
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Notas del proyecto</h1>
            {!canEdit ? (
              <span className="rounded-full bg-slate-500/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Solo lectura
              </span>
            ) : null}
          </div>

          {notesError ? (
            <div className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-600 dark:bg-red-950/40 dark:text-red-300">
              {notesError}
            </div>
          ) : null}

          {notesLoading ? (
            <div className="inline-flex items-center gap-2 text-sm text-slate-500">
              <Loader2 size={14} className="animate-spin" /> Cargando notas...
            </div>
          ) : notes.length === 0 ? (
            <div className="surface-soft rounded-[2rem] p-8 text-center text-slate-400 italic">No hay notas para este proyecto.</div>
          ) : (
            <div className="space-y-2">
              {notes.map((note) => (
                <article key={note.id} className="rounded-2xl border border-black/10 p-3" style={{ backgroundColor: note.color }}>
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <h3 className="truncate text-sm font-bold text-slate-900">{note.title || "Nota sin titulo"}</h3>
                    <span className="text-[10px] font-semibold text-slate-600">{new Date(note.updatedAt).toLocaleDateString()}</span>
                  </div>
                  <p className="line-clamp-3 whitespace-pre-wrap text-xs leading-relaxed text-slate-700">{note.content || "(Sin contenido)"}</p>

                  <div className="mt-2 flex items-center justify-end gap-2">
                    {canEdit ? (
                      <button
                        type="button"
                        onClick={() => openEdit(note)}
                        className="inline-flex items-center gap-1 rounded-lg bg-white/75 px-2 py-1 text-[11px] font-semibold text-slate-700"
                      >
                        <Pencil size={12} /> Editar
                      </button>
                    ) : null}
                    {canEdit ? (
                      <button
                        type="button"
                        onClick={() => void deleteNote(note.id)}
                        disabled={deletingNoteId === note.id}
                        className="inline-flex items-center gap-1 rounded-lg bg-red-500/85 px-2 py-1 text-[11px] font-semibold text-white disabled:opacity-70"
                      >
                        {deletingNoteId === note.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />} Eliminar
                      </button>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      {editingNote ? (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xl rounded-2xl border border-orion-border bg-orion-surface p-4 shadow-2xl dark:border-orion-dark-border dark:bg-slate-900">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Editar nota del proyecto</h3>
              <button
                type="button"
                onClick={() => setEditingNote(null)}
                className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <input
                type="text"
                value={editingTitle}
                onChange={(event) => setEditingTitle(event.target.value.slice(0, 120))}
                placeholder="Titulo"
                className="input-orion"
              />
              <textarea
                value={editingContent}
                onChange={(event) => setEditingContent(event.target.value.slice(0, 10000))}
                placeholder="Contenido"
                className="input-orion min-h-[180px]"
              />
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button type="button" onClick={() => setEditingNote(null)} className="btn-secondary text-sm" disabled={savingNote}>
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void saveEdited()}
                disabled={savingNote}
                className="btn-primary rounded-xl px-4 py-2 text-sm font-bold disabled:opacity-70"
              >
                {savingNote ? <Loader2 size={14} className="animate-spin" /> : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
