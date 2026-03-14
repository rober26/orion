"use client";
import FileExplorer from "@/src/components/notebooks/FileExplorer";
import { BookOpen, Sparkles, Clock, Plus } from "lucide-react";

export default function NotebooksPage() {
  return (
    <div className="flex h-[calc(100vh-160px)] bg-white dark:bg-slate-900/50 rounded-[2rem] border border-orion-border dark:border-slate-800 overflow-hidden shadow-sm">
      <FileExplorer />
      
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
        <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 rounded-3xl flex items-center justify-center text-orion-primary mb-6">
          <BookOpen size={40} />
        </div>
        <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">
          Tu Cerebro Digital
        </h1>
        <p className="text-slate-500 max-w-md mb-8">
          Selecciona un cuaderno o crea una nueva nota para empezar a conectar tus ideas. 
          Orion organiza tu conocimiento de forma jerárquica y visual.
        </p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg">
          <QuickAction icon={<Plus size={20} />} label="Nueva Nota" />
          <QuickAction icon={<Sparkles size={20} />} label="Abrir Grafo" />
        </div>
      </div>
    </div>
  );
}

function QuickAction({ icon, label }: { icon: React.ReactNode, label: string }) {
  return (
    <button className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-orion-primary hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all group">
      <span className="text-slate-400 group-hover:text-orion-primary transition-colors">
        {icon}
      </span>
      <span className="font-semibold text-slate-700 dark:text-slate-300">
        {label}
      </span>
    </button>
  );
}