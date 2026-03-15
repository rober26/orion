"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

export interface EditorProps {
  initialContent: any;
  documentId: string; 
}

export default function Editor({ initialContent, documentId }: EditorProps) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: initialContent,
    onUpdate: ({ editor }) => {
      const json = editor.getJSON();
      console.log(`Editando documento: ${documentId}`);
    },
  });

  return (
    <div className="relative w-full">
      <EditorContent 
        editor={editor} 
        className="prose prose-slate dark:prose-invert max-w-none min-h-500px outline-none"
      />
    </div>
  );
}