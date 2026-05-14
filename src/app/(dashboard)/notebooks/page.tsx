"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import FileExplorer from "@/src/components/notebooks/FileExplorer";
import Editor from "@/src/components/notebooks/Editor";
import ExplorerPanel from "@/src/components/notebooks/ExplorerPanel";
import { BookOpen, Sparkles, Plus, Loader2, RefreshCcw, Search } from "lucide-react";

type QuickNote = {
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
};

function NotebooksContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedDocumentId = searchParams.get("doc");
  const selectedFolderId = searchParams.get("folder");
  const selectedNotebookId = searchParams.get("notebook");
  const highlightedTab = searchParams.get("tab");
  const [isCreating, setIsCreating] = useState(false);
  const [quickNotes, setQuickNotes] = useState<QuickNote[]>([]);
  const [notesLoading, setNotesLoading] = useState(true);
  const [notesError, setNotesError] = useState<string | null>(null);
  const [notesSearch, setNotesSearch] = useState("");

  const handleCreateNote = async () => {
    if (isCreating) return;
    setIsCreating(true);

    try {
      const response = await fetch("/api/notebooks/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Nueva nota sin título",
          notebookId: null,      
          projectId: null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Fallo al crear la nota en el servidor.");
      }

      router.refresh();
      router.push(`/notebooks?doc=${result.id}`);

    } catch (error: unknown) {
      console.error("Error al crear nota:", error);
      const message = error instanceof Error ? error.message : "Ocurrio un error inesperado.";
      alert(message);
    } finally {
      setIsCreating(false);
    }
  };

  const loadQuickNotes = useCallback(async () => {
    try {
      setNotesLoading(true);
      setNotesError(null);

      const query = new URLSearchParams();
      query.set("archived", "false");
      if (notesSearch.trim()) {
        query.set("q", notesSearch.trim());
      }

      const response = await fetch(`/api/notes?${query.toString()}`, { cache: "no-store" });
      const payload = (await response.json()) as QuickNote[] | { error?: string };

      if (!response.ok) {
        throw new Error((payload as { error?: string }).error || "No se pudieron cargar notas rapidas");
      }

      setQuickNotes(Array.isArray(payload) ? payload.slice(0, 12) : []);
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudieron cargar notas rapidas";
      setNotesError(message);
      setQuickNotes([]);
    } finally {
      setNotesLoading(false);
    }
  }, [notesSearch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadQuickNotes();
    }, 180);

    return () => clearTimeout(timer);
  }, [loadQuickNotes]);

  return (
    <div className="flex h-full min-h-0 surface-panel rounded-[2rem] overflow-hidden">
      <FileExplorer collapsible />

      {selectedDocumentId ? (
        <Editor documentId={selectedDocumentId} />
      ) : selectedFolderId || selectedNotebookId ? (
        <ExplorerPanel folderId={selectedFolderId} notebookId={selectedNotebookId} />
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto bg-slate-50/30 p-4 dark:bg-transparent sm:p-6 lg:p-8">
          <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
            <section className="surface-panel rounded-3xl p-6 text-center lg:text-left">
              <div className="relative mb-8 inline-flex">
                <div className="flex h-24 w-24 items-center justify-center rounded-[2rem] bg-orion-primary/10 text-orion-primary transition-all duration-500 hover:scale-110 dark:bg-orion-primary/20">
                  {isCreating ? <Loader2 className="animate-spin" size={48} /> : <BookOpen size={48} />}
                </div>
                {isCreating && (
                  <div className="absolute -bottom-2 -right-2 rounded-full border border-orion-border bg-orion-surface p-2 shadow-xl dark:border-orion-dark-border dark:bg-slate-900">
                    <Loader2 className="animate-spin text-orion-primary" size={20} />
                  </div>
                )}
              </div>

              <h1 className="mb-4 text-4xl font-black tracking-tight text-slate-900 dark:text-white">Tu Cerebro Digital</h1>
              <p className="mb-10 max-w-md text-lg leading-relaxed text-slate-500 dark:text-slate-400">
                Organiza tus ideas de forma jerarquica. Crea una nota para empezar a construir tu red de conocimiento.
              </p>

              <div className="grid w-full max-w-lg grid-cols-1 gap-4 sm:grid-cols-2">
                <QuickAction
                  icon={<Plus size={22} />}
                  label={isCreating ? "Sincronizando..." : "Nueva Nota"}
                  onClick={handleCreateNote}
                  disabled={isCreating}
                  primary
                />
                <QuickAction
                  icon={<Sparkles size={22} />}
                  label="Visualizar Grafo"
                  onClick={() => router.push("/notebooks/graph")}
                  disabled={isCreating}
                />
              </div>
            </section>

            <section className={`surface-panel rounded-3xl p-5 ${highlightedTab === "quick-notes" ? "ring-2 ring-orion-primary/35" : ""}`}>
              <div className="mb-4 flex items-center justify-between gap-2">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Integrado en Notebooks</p>
                  <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">Notas rapidas</h2>
                </div>
                <button
                  type="button"
                  onClick={() => void loadQuickNotes()}
                  className="icon-btn rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  aria-label="Recargar notas"
                >
                  <RefreshCcw size={16} />
                </button>
              </div>

              <label className="relative mb-3 block">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={notesSearch}
                  onChange={(event) => setNotesSearch(event.target.value)}
                  placeholder="Buscar notas rapidas"
                  className="input-orion pl-9"
                />
              </label>

              {notesError ? (
                <div className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-600 dark:bg-red-950/40 dark:text-red-300">
                  {notesError}
                </div>
              ) : notesLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="h-24 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
                  ))}
                </div>
              ) : quickNotes.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-orion-border px-4 py-8 text-center dark:border-orion-dark-border">
                  <p className="text-sm text-slate-500">No hay notas rapidas por ahora.</p>
                  <p className="mt-1 text-xs text-slate-400">Usa el boton flotante para crear una.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {quickNotes.map((note) => (
                    <article
                      key={note.id}
                      className="rounded-2xl border border-black/10 p-3"
                      style={{ backgroundColor: note.color }}
                    >
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <h3 className="truncate text-sm font-bold text-slate-900">{note.title || "Nota sin titulo"}</h3>
                        <span className="text-[10px] font-semibold text-slate-600">{new Date(note.updatedAt).toLocaleDateString()}</span>
                      </div>
                      <p className="line-clamp-3 whitespace-pre-wrap text-xs leading-relaxed text-slate-700">
                        {note.content || "(Sin contenido)"}
                      </p>
                      {note.project ? (
                        <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-white/70 px-2 py-1 text-[10px] font-bold text-slate-700">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: note.project.color || "#3b82f6" }}
                          />
                          {note.project.name}
                        </div>
                      ) : null}
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      )}
    </div>
  );
}

export default function NotebooksPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full min-h-0 surface-panel rounded-[2rem] overflow-hidden items-center justify-center text-slate-300">
          <Loader2 className="animate-spin" size={20} />
        </div>
      }
    >
      <NotebooksContent />
    </Suspense>
  );
}

interface QuickActionProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
}

function QuickAction({ icon, label, onClick, disabled, primary }: QuickActionProps) {
  return (
    <button 
      onClick={onClick}
      disabled={disabled}
      className={`
        flex items-center justify-center gap-3 p-5 rounded-2xl border font-bold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-wait
        ${primary 
          ? "bg-orion-primary text-white border-transparent hover:bg-blue-700 shadow-lg shadow-blue-500/20" 
          : "bg-orion-surface dark:bg-slate-800/50 border-orion-border dark:border-orion-dark-border text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
        }
      `}
    >
      <span className={primary ? "text-white" : "text-orion-primary"}>
        {icon}
      </span>
      {label}
    </button>
  );
}
