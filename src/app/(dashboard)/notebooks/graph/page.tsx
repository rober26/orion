"use client";

import { Suspense } from "react";
import FileExplorer from "@/src/components/notebooks/FileExplorer";
import { Loader2, Network } from "lucide-react";

function GraphContent() {
  return (
    <div className="flex h-full min-h-0 surface-panel rounded-[2rem] overflow-hidden shadow-sm">
      <FileExplorer collapsible />
      <div className="flex-1 min-h-0 flex items-center justify-center bg-slate-900 p-8">
        <div className="max-w-xl text-center">
          <div className="mx-auto mb-5 w-16 h-16 rounded-2xl bg-orion-primary/15 border border-orion-primary/30 flex items-center justify-center">
            <Network className="text-orion-primary" size={28} />
          </div>
          <h1 className="text-2xl font-black text-white mb-3">Vista de grafo</h1>
          <p className="text-slate-300 leading-relaxed">
            Aqui veras la relacion entre cuadernos y documentos. Por ahora puedes seguir organizando tu contenido desde el
            explorador lateral.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function NotebooksGraphPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full min-h-0 surface-panel rounded-[2rem] overflow-hidden items-center justify-center text-slate-300">
          <Loader2 className="animate-spin" size={20} />
        </div>
      }
    >
      <GraphContent />
    </Suspense>
  );
}
