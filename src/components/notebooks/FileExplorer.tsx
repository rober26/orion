"use client";
import { useState, useEffect } from "react";
import { Folder, Book, FileText, ChevronRight, ChevronDown, Plus, MoreVertical, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function FileExplorer() {
  const params = useParams();
  const [folders, setFolders] = useState([]);
  const [standaloneDocs, setStandaloneDocs] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const loadExplorerData = async () => {
      try {
        setLoading(true);
        const [foldersRes, docsRes] = await Promise.all([
          fetch("/api/notebooks/folders"),
          fetch("/api/notebooks/documents") 
        ]);

        const foldersData = await foldersRes.json();
        const docsData = await docsRes.json();

        setFolders(foldersData);
        setStandaloneDocs(docsData.filter((doc: any) => !doc.notebookId));
        
      } catch (error) {
        console.error("Error cargando el explorador:", error);
      } finally {
        setLoading(false);
      }
    };

    loadExplorerData();
  }, [params.id]); 

  const toggleFolder = (id: string) => {
    setExpandedFolders(prev => ({ ...prev, [id]: !prev[id] }));
  };

  if (loading) return (
    <div className="w-72 border-r border-orion-border dark:border-orion-dark-border p-4 flex items-center gap-2 text-slate-400">
      <Loader2 size={16} className="animate-spin" />
      <span className="text-sm">Sincronizando...</span>
    </div>
  );

  return (
    <div className="w-72 border-r border-orion-border dark:border-orion-dark-border h-full flex flex-col bg-orion-surface-muted/60 dark:bg-transparent">
      <div className="p-4 flex items-center justify-between border-b border-orion-border dark:border-orion-dark-border">
        <h2 className="font-bold text-slate-900 dark:text-white text-sm uppercase tracking-wider">Explorador</h2>
        <button className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors">
          <Plus size={18} className="text-orion-primary" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-4">
        
        <div className="space-y-1">
          <p className="px-2 pb-1 text-[10px] font-bold text-slate-400 uppercase">Colecciones</p>
          {folders.map((folder: any) => (
            <div key={folder.id} className="space-y-1">
              <button 
                onClick={() => toggleFolder(folder.id)}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 rounded-lg transition-all"
              >
                {expandedFolders[folder.id] ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
                <Folder size={18} className="text-amber-400 fill-amber-400/20" />
                <span className="truncate">{folder.name}</span>
              </button>

              {expandedFolders[folder.id] && (
                <div className="ml-4 pl-2 border-l border-orion-border dark:border-orion-dark-border space-y-1">
                  {folder.notebooks?.map((nb: any) => (
                    <Link 
                      key={nb.id} 
                      href={`/notebooks/${nb.id}`}
                      className="flex items-center gap-2 px-2 py-1.5 text-sm text-slate-500 hover:text-orion-primary transition-colors"
                    >
                      <Book size={16} style={{ color: nb.color }} />
                      <span className="truncate">{nb.title}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="space-y-1">
          <p className="px-2 pb-1 text-[10px] font-bold text-slate-400 uppercase">Notas Rápidas</p>
          {standaloneDocs.length === 0 && (
            <p className="px-2 py-4 text-xs text-slate-400 italic">No hay notas huérfanas</p>
          )}
          {standaloneDocs.map((doc: any) => (
            <Link 
              key={doc.id} 
              href={`/notebooks/editor/${doc.id}`}
              className={`flex items-center gap-2 px-2 py-2 text-sm rounded-lg transition-all ${
                params.id === doc.id 
                  ? "bg-orion-primary/10 text-orion-primary font-semibold border-r-2 border-orion-primary" 
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50"
              }`}
            >
              <FileText size={16} className={params.id === doc.id ? "text-orion-primary" : "text-slate-400"} />
              <span className="truncate">{doc.title || "Sin título"}</span>
            </Link>
          ))}
        </div>

      </div>
    </div>
  );
}
