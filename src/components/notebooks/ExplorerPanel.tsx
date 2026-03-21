"use client";

import { useEffect, useMemo, useState } from "react";
import { Book, FileText, Folder, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface FolderDocument {
  id: string;
  title: string;
}

interface FolderNotebook {
  id: string;
  title: string;
  color: string | null;
  folderId?: string | null;
  documents: FolderDocument[];
}

interface FolderData {
  id: string;
  name: string;
  notebooks: FolderNotebook[];
}

interface NotebookData {
  id: string;
  title: string;
  color: string | null;
  folderId?: string | null;
  documents: FolderDocument[];
}

interface ExplorerPanelProps {
  folderId?: string | null;
  notebookId?: string | null;
}

interface RenameState {
  id: string;
  type: "notebook" | "document";
  value: string;
}

export default function ExplorerPanel({ folderId, notebookId }: ExplorerPanelProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [folder, setFolder] = useState<FolderData | null>(null);
  const [notebook, setNotebook] = useState<NotebookData | null>(null);
  const [rename, setRename] = useState<RenameState | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);

        if (folderId) {
          const response = await fetch("/api/notebooks/folders");
          const data = (await response.json()) as FolderData[];
          setFolder(data.find((item) => item.id === folderId) ?? null);
          setNotebook(null);
          return;
        }

        if (notebookId) {
          const response = await fetch("/api/notebooks");
          const data = (await response.json()) as NotebookData[];
          setNotebook(data.find((item) => item.id === notebookId) ?? null);
          setFolder(null);
          return;
        }
      } catch {
        setFolder(null);
        setNotebook(null);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [folderId, notebookId]);

  const title = useMemo(() => {
    if (folder) {
      return folder.name;
    }
    if (notebook) {
      return notebook.title;
    }
    return "Explorador";
  }, [folder, notebook]);

  const commitRename = async () => {
    if (!rename) {
      return;
    }

    const nextValue = rename.value.trim();
    const current = rename;
    setRename(null);

    if (!nextValue) {
      return;
    }

    if (current.type === "document") {
      await fetch(`/api/notebooks/documents/${current.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: nextValue }),
      });
    }

    if (current.type === "notebook") {
      const source = folder?.notebooks.find((item) => item.id === current.id) ?? (notebook?.id === current.id ? notebook : null);
      if (source) {
        await fetch(`/api/notebooks/${current.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: nextValue,
            description: "",
            color: source.color,
            icon: "Book",
            folderId: source.folderId ?? null,
            isPublic: false,
          }),
        });
      }
    }

    if (folderId || notebookId) {
      setLoading(true);
      try {
        if (folderId) {
          const response = await fetch("/api/notebooks/folders");
          const data = (await response.json()) as FolderData[];
          setFolder(data.find((item) => item.id === folderId) ?? null);
        }
        if (notebookId) {
          const response = await fetch("/api/notebooks");
          const data = (await response.json()) as NotebookData[];
          setNotebook(data.find((item) => item.id === notebookId) ?? null);
        }
      } finally {
        setLoading(false);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex-1 min-h-0 flex items-center justify-center bg-slate-900">
        <Loader2 className="animate-spin text-orion-primary" />
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-slate-900">
      <header className="px-6 py-5 border-b border-orion-border dark:border-orion-dark-border bg-slate-900">
        <h2 className="text-3xl font-black text-white truncate">{title || "Sin titulo"}</h2>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6">
        {folder && (
          <div className="space-y-4">
            {folder.notebooks.length === 0 ? (
              <div className="text-slate-200 italic">Esta carpeta no tiene cuadernos.</div>
            ) : (
              folder.notebooks.map((folderNotebook) => (
                <div key={folderNotebook.id} className="rounded-2xl border border-orion-border dark:border-orion-dark-border bg-slate-900 p-4">
                  <button
                    type="button"
                    onClick={() => router.push(`/notebooks?notebook=${folderNotebook.id}`)}
                    className="w-full flex items-center gap-2 text-left mb-3 rounded-md px-2 py-1.5 hover:bg-slate-800/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orion-primary/60"
                    onDoubleClick={(event) => {
                      event.preventDefault();
                      setRename({ id: folderNotebook.id, type: "notebook", value: folderNotebook.title || "" });
                    }}
                  >
                    <Book size={18} className="text-blue-400" />
                    {rename?.id === folderNotebook.id && rename.type === "notebook" ? (
                      <input
                        value={rename.value}
                        onChange={(event) => setRename((prev) => (prev ? { ...prev, value: event.target.value } : prev))}
                        onBlur={() => void commitRename()}
                        onKeyDown={(event) => event.key === "Enter" && void commitRename()}
                        className="w-full bg-transparent text-white font-semibold outline-none"
                        onClick={(event) => event.stopPropagation()}
                        onDoubleClick={(event) => event.stopPropagation()}
                      />
                    ) : (
                      <span className="font-semibold text-white">{folderNotebook.title || "Sin titulo"}</span>
                    )}
                  </button>

                  <div className="space-y-1">
                    {folderNotebook.documents.map((doc) => (
                      <button
                        key={doc.id}
                        type="button"
                        onClick={() => router.push(`/notebooks?doc=${doc.id}`)}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left hover:bg-slate-800/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orion-primary/60"
                        onDoubleClick={(event) => {
                          event.preventDefault();
                          setRename({ id: doc.id, type: "document", value: doc.title || "" });
                        }}
                      >
                        <FileText size={14} className="text-slate-300" />
                        {rename?.id === doc.id && rename.type === "document" ? (
                          <input
                            value={rename.value}
                            onChange={(event) => setRename((prev) => (prev ? { ...prev, value: event.target.value } : prev))}
                            onBlur={() => void commitRename()}
                            onKeyDown={(event) => event.key === "Enter" && void commitRename()}
                            className="w-full bg-transparent text-white text-sm outline-none"
                            onClick={(event) => event.stopPropagation()}
                            onDoubleClick={(event) => event.stopPropagation()}
                          />
                        ) : (
                          <span className="truncate text-sm text-white">{doc.title || "Sin titulo"}</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {notebook && (
          <div className="rounded-2xl border border-orion-border dark:border-orion-dark-border bg-slate-900 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Book size={18} className="text-blue-400" />
              <span className="font-semibold text-white">Documentos</span>
            </div>

            <div className="space-y-1">
              {notebook.documents.length === 0 && <div className="text-slate-200 italic">Este cuaderno esta vacio.</div>}
              {notebook.documents.map((doc) => (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => router.push(`/notebooks?doc=${doc.id}`)}
                  className="w-full flex items-center gap-2 px-2 py-2 rounded-md text-left hover:bg-slate-800/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orion-primary/60"
                  onDoubleClick={(event) => {
                    event.preventDefault();
                    setRename({ id: doc.id, type: "document", value: doc.title || "" });
                  }}
                >
                  <FileText size={14} className="text-slate-300" />
                  {rename?.id === doc.id && rename.type === "document" ? (
                    <input
                      value={rename.value}
                      onChange={(event) => setRename((prev) => (prev ? { ...prev, value: event.target.value } : prev))}
                      onBlur={() => void commitRename()}
                      onKeyDown={(event) => event.key === "Enter" && void commitRename()}
                      className="w-full bg-transparent text-white text-sm outline-none"
                      onClick={(event) => event.stopPropagation()}
                      onDoubleClick={(event) => event.stopPropagation()}
                    />
                  ) : (
                    <span className="truncate text-sm text-white">{doc.title || "Sin titulo"}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {!folder && !notebook && (
          <div className="h-full min-h-[300px] flex items-center justify-center text-slate-200">
            <div className="flex items-center gap-2">
              <Folder size={18} />
              <span>No se encontro el contenido seleccionado.</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
