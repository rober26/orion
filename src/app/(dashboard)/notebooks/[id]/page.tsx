"use client";
import { useState, useEffect } from "react";
import FileExplorer from "@/src/components/notebooks/FileExplorer";
import { FileText, Calendar, User, Plus, Loader2 } from "lucide-react";
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
  }>;
}

export default function NotebookDetailPage({ params }: { params: { id: string } }) {
  const [notebook, setNotebook] = useState<NotebookData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/notebooks/${params.id}`)
      .then((res) => res.json())
      .then((data) => {
        setNotebook(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [params.id]);

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
                  </div>
                  <h1 className="text-4xl font-black text-slate-900 dark:text-white">
                    {notebook.title}
                  </h1>
                </div>
                <button className="btn-primary px-4 py-2 rounded-xl font-bold shadow-lg shadow-blue-500/20">
                  <Plus size={20} />
                  Nueva Nota
                </button>
              </div>
            </header>

            <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {notebook.documents.length > 0 ? (
                notebook.documents.map((doc) => (
                  <Link 
                    key={doc.id} 
                    href={`/notebooks/editor/${doc.id}`} // Ruta para el futuro editor TipTap
                    className="p-6 surface-panel dark:bg-slate-800 rounded-2xl hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-slate-50 dark:bg-slate-700 flex items-center justify-center mb-4 group-hover:bg-orion-primary/10 transition-colors">
                      <FileText className="text-orion-primary" size={20} />
                    </div>
                    <h3 className="font-bold text-slate-900 dark:text-white mb-2 group-hover:text-orion-primary transition-colors line-clamp-1">
                      {doc.title}
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
            <p className="text-slate-500">No se encontró el cuaderno.</p>
          </div>
        )}
      </div>
    </div>
  );
}
