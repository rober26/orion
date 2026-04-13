"use client";
import { FileText, FolderKanban } from "lucide-react";
import type { CalendarSourceType } from "@/src/components/calendar/types";

interface CalendarEventProps {
  title: string;
  type: CalendarSourceType;
  color?: string;
  timeLabel?: string;
  draggable?: boolean;
  onClick?: () => void;
}

export default function CalendarEvent({ title, type, color, timeLabel, draggable, onClick }: CalendarEventProps) {
  const isProject = type === "project";
  const isEvent = type === "event";
  
  return (
    <div 
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      className={`
        group cursor-pointer flex items-center gap-1.5 p-1.5 rounded-lg text-[10px] font-bold border transition-all
        hover:scale-[1.02] active:scale-95 truncate
        ${
          isProject
            ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400"
            : isEvent
              ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400"
              : "bg-slate-50 dark:bg-slate-800 border-orion-border dark:border-orion-dark-border text-slate-600 dark:text-slate-400"
        }
      `}
      style={isEvent && color ? { borderLeftWidth: "3px", borderLeftColor: color } : undefined}
      title={draggable ? "Arrastra para reprogramar" : undefined}
    >
      {isProject ? <FolderKanban size={10} /> : <FileText size={10} />}
      <span className="truncate">{timeLabel ? `${timeLabel} · ${title}` : title}</span>
    </div>
  );
}
