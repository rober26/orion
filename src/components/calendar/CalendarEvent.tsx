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
  const isTask = type === "task";
  
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      className={`
        group w-full text-left cursor-pointer flex items-center gap-1.5 p-1.5 rounded-lg text-[10px] font-bold border transition-all
        hover:scale-[1.02] active:scale-95 truncate
        ${
          isProject
            ? "bg-cyan-50 dark:bg-cyan-950/30 border-cyan-200 dark:border-cyan-800 text-cyan-700 dark:text-cyan-300"
            : isEvent
              ? "bg-cyan-50 dark:bg-cyan-950/30 border-cyan-200 dark:border-cyan-800 text-cyan-700 dark:text-cyan-300"
              : isTask
                ? "bg-slate-50 dark:bg-slate-800 border-orion-border dark:border-orion-dark-border text-slate-700 dark:text-slate-300"
                : "bg-slate-50 dark:bg-slate-800 border-orion-border dark:border-orion-dark-border text-slate-600 dark:text-slate-400"
        }
      `}
      style={isEvent && color ? { borderLeftWidth: "3px", borderLeftColor: color } : undefined}
      title={draggable ? "Arrastra para reprogramar" : undefined}
      aria-label={title}
    >
      {isProject ? <FolderKanban size={10} /> : <FileText size={10} />}
      <span className="truncate">{timeLabel ? `${timeLabel} · ${title}` : title}</span>
    </button>
  );
}
