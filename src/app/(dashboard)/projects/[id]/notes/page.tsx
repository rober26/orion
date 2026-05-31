"use client";

import { use, useEffect, useState } from "react";
import { Loader2, Pencil, StickyNote, Trash2 } from "lucide-react";
import ProjectSidebar from "@/src/components/projects/ProjectSidebar";
import QuickNoteModal, { type QuickNoteDraft } from "@/src/components/notes/QuickNoteModal";

interface QuickNoteItem {
  id: string;
  title: string;
  content: string;
  color: string;
  updatedAt: string;
  project?: {
    id: string;
    name: string;
    color?: string | null;
  } | null;
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
  };

  const saveEdited = async (draft: QuickNoteDraft) => {
    if (!editingNote || savingNote) {
      return;
    }

    try {
      setSavingNote(true);
      const response = await fetch(`/api/notes/${editingNote.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: draft.title,
          content: draft.content,
          color: draft.color,
          projectId: draft.projectId,
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
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {notes.map((note) => (
                <article
                  key={note.id}
                  className="group relative min-h-[160px] rounded-2xl border border-black/10 p-3 shadow-[0_8px_18px_rgba(15,23,42,0.12)] transition-transform hover:-translate-y-0.5"
                  style={{ backgroundColor: note.color }}
                >
                  <div className="pointer-events-none absolute right-0 top-0 h-0 w-0 border-b-[14px] border-l-[14px] border-b-white/50 border-l-transparent" />
                  <div className="pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.28),transparent_45%)]" />
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <h3 className="truncate text-sm font-bold text-slate-900">{note.title || "Nota sin titulo"}</h3>
                    <span className="text-[10px] font-semibold text-slate-600">{new Date(note.updatedAt).toLocaleDateString()}</span>
                  </div>
                  <p className="line-clamp-6 whitespace-pre-wrap text-xs leading-relaxed text-slate-700">{note.content || "(Sin contenido)"}</p>

                  {note.project ? (
                    <p className="mt-2 truncate text-[10px] font-semibold uppercase tracking-wide text-slate-700/80">{note.project.name}</p>
                  ) : null}

                  <div className="absolute bottom-3 right-3 flex items-center justify-end gap-2 opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
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

      <QuickNoteModal
        open={editingNote !== null}
        title="Editar nota del proyecto"
        initialValue={
          editingNote
            ? {
                title: editingNote.title,
                content: editingNote.content,
                color: editingNote.color,
                projectId: editingNote.project?.id || id,
              }
            : undefined
        }
        submitting={savingNote}
        error={notesError}
        onClose={() => {
          if (!savingNote) {
            setEditingNote(null);
          }
        }}
        onSave={(draft) => {
          void saveEdited(draft);
        }}
      />
    </div>
  );
}
