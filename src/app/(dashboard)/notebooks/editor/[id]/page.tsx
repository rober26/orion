"use client";
import { use } from "react";
import FileExplorer from "@/src/components/notebooks/FileExplorer";
import Editor from "@/src/components/notebooks/Editor";

export default function DocumentEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return (
    <div className="flex h-full min-h-0 surface-panel rounded-[2rem] overflow-hidden shadow-sm">
      <FileExplorer collapsible />
      <Editor documentId={id} />
    </div>
  );
}
