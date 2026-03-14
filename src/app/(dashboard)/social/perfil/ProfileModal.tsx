"use client";
import { X } from "lucide-react";
import ProfileContent from "./ProfileContent";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 sm:p-8">
      <div className="relative w-full h-full max-w-6xl bg-white dark:bg-slate-950 rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden border border-orion-border dark:border-slate-800 animate-in fade-in zoom-in duration-300">
        <button onClick={onClose} className="absolute top-8 right-8 p-2 text-slate-400 hover:text-orion-primary z-50">
          <X size={32} />
        </button>
        <div className="flex-1 overflow-y-auto p-8 sm:p-16">
          <ProfileContent />
        </div>
      </div>
    </div>
  );
}