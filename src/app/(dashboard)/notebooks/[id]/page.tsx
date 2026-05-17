"use client";
import { useState, useEffect } from "react";
import FileExplorer from "@/src/components/notebooks/FileExplorer";
import { FileText, Calendar, Plus, Loader2, Share2 } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface NotebookData {
  id: string;
  title: string;
  color: string;
  documents: Array<{
    id: string;
    title: string;
    icon: string;
    updatedAt: string;
    isSharedWithMe?: boolean;
  }>;
  isSharedWithMe?: boolean;
}

export default function NotebookDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [notebook, setNotebook] = useState<NotebookData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetch(`/api/notebooks/${params.id}`)
      .then(async (res) => {
        if (!res.ok) {
          const payload = (await res.json()) as { error?: string };
          throw new Error(payload.error ?? "Acceso denegado");
        }
        return res.json();
      })
      .then((data) => {
        setNotebook(data);
        setLoading(false);
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : "Acceso denegado";
        setError(message);
        setLoading(false);
      });
  }, [params.id]);

  const handleCreateDocument = async () => {
    if (!notebook || isCreating) {
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch("/api/notebooks/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Nueva nota sin titulo",
          notebookId: notebook.id,
        }),
      });

      const payload = (await response.json()) as { id?: string; error?: string };

      if (!response.ok || !payload.id) {
        throw new Error(payload.error || "No se pudo crear la nota");
      }

      router.push(`/notebooks?doc=${payload.id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo crear la nota";
      alert(message);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-160px)] surface-panel rounded-[2rem] overflow-hidden shadow-sm">
      <FileExplorer />

      <div className="flex-1 overflow-y-auto bg-slate-50/30 dark:bg-transparent">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="animate-spin text-orion-primary" size={32} />
          </div>
        ) : notebook ? (
          <>
            <header className="p-8 border-b border-orion-border dark:border-orion-dark-border bg-orion-surface dark:bg-slate-900/40">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-4 mb-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: notebook.color || '#3b82f6' }} 
                    />
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                      Notebook
                    </span>
                    {notebook.isSharedWithMe && (
                      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full bg-cyan-500/20 text-cyan-300 uppercase tracking-wider">
                        <Share2 size={10} /> Compartido
                      </span>
                    )}
                  </div>
                  <h1 className="text-4xl font-black text-slate-900 dark:text-white">
                    {notebook.title}
                  </h1>
                </div>
                <button
                  type="button"
                  onClick={() => void handleCreateDocument()}
                  disabled={isCreating}
                  className="btn-primary px-4 py-2 rounded-xl font-bold shadow-lg shadow-blue-500/20 disabled:opacity-60"
                >
                  <Plus size={20} />
                  {isCreating ? "Creando..." : "Nueva Nota"}
                </button>
              </div>
            </header>

            <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {notebook.documents.length > 0 ? (
                notebook.documents.map((doc) => (
                  <Link 
                    key={doc.id} 
                    href={`/notebooks?doc=${doc.id}`}
                    className="p-6 surface-panel dark:bg-slate-800 rounded-2xl hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-slate-50 dark:bg-slate-700 flex items-center justify-center mb-4 group-hover:bg-orion-primary/10 transition-colors">
                      <FileText className="text-orion-primary" size={20} />
                    </div>
                    <h3 className="font-bold text-slate-900 dark:text-white mb-2 group-hover:text-orion-primary transition-colors line-clamp-1">
                      <span className="inline-flex items-center gap-2">
                        {doc.title}
                        {doc.isSharedWithMe && <Share2 size={12} className="text-cyan-300" />}
                      </span>
                    </h3>
                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Calendar size={12} /> 
                        {new Date(doc.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="col-span-full py-20 text-center">
                  <p className="text-slate-400 italic">Este cuaderno está vacío. ¡Empieza a escribir!</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex h-full items-center justify-center">
            <p className="text-slate-500">{error || "No se encontró el cuaderno."}</p>
          </div>
        )}
      </div>
    </div>
  );
}
