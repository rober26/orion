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
        group w-full text-left cursor-pointer flex items-center gap-1.5 px-1.5 py-1 rounded-md text-[10px] font-semibold border transition-colors
        truncate
        ${
          isProject
            ? "bg-blue-50 dark:bg-blue-950/25 border-blue-200 dark:border-blue-800 text-orion-primary hover:bg-blue-100 dark:hover:bg-blue-900/35"
            : isEvent
              ? "bg-blue-50 dark:bg-blue-950/25 border-blue-200 dark:border-blue-800 text-orion-primary hover:bg-blue-100 dark:hover:bg-blue-900/35"
              : isTask
                ? "bg-slate-50 dark:bg-slate-800 border-orion-border dark:border-orion-dark-border text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                : "bg-slate-50 dark:bg-slate-800 border-orion-border dark:border-orion-dark-border text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
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
