"use client";
import { useState, useEffect } from "react";
import { Folder, Book, FileText, ChevronRight, ChevronDown, Plus, MoreVertical } from "lucide-react";
import Link from "next/link";

export default function FileExplorer() {
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch("/api/notebooks/folders")
      .then(res => res.json())
      .then(data => {
        setFolders(data);
        setLoading(false);
      });
  }, []);

  const toggleFolder = (id: string) => {
    setExpandedFolders(prev => ({ ...prev, [id]: !prev[id] }));
  };

  if (loading) return <div className="p-4 text-slate-400 animate-pulse">Cargando cerebro...</div>;

  return (
    <div className="w-72 border-r border-orion-border dark:border-slate-800 h-full flex flex-col bg-white/50 dark:bg-transparent">
      <div className="p-4 flex items-center justify-between border-b border-orion-border dark:border-slate-800">
        <h2 className="font-bold text-slate-900 dark:text-white">Explorador</h2>
        <button className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors">
          <Plus size={18} className="text-orion-primary" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {folders.map((folder: any) => (
          <div key={folder.id} className="space-y-1">
            {/* Carpeta */}
            <button 
              onClick={() => toggleFolder(folder.id)}
              className="w-full flex items-center gap-2 px-2 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 rounded-lg transition-all"
            >
              {expandedFolders[folder.id] ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
              <Folder size={18} className="text-amber-400 fill-amber-400/20" />
              <span className="truncate">{folder.name}</span>
            </button>

            {/* Contenido de la carpeta (Notebooks) */}
            {expandedFolders[folder.id] && (
              <div className="ml-4 pl-2 border-l border-slate-200 dark:border-slate-800 space-y-1">
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
    </div>
  );
}