"use client";

import { useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import type { MouseEvent, ReactNode } from "react";

export type ContextMenuItem = {
  label: string;
  tone?: "default" | "danger";
  disabled?: boolean;
  hint?: string;
  onSelect: (event: MouseEvent<HTMLButtonElement>) => void;
};

export default function ContextMenu({
  open,
  items,
  extraContent,
  className,
  position,
  onRequestClose,
}: {
  open: boolean;
  items: ContextMenuItem[];
  extraContent?: ReactNode;
  className?: string;
  position?: { x: number; y: number } | null;
  onRequestClose?: () => void;
}) {
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open || !onRequestClose) {
      return;
    }

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onRequestClose();
      }
    };

    const onPointerDown = (event: PointerEvent) => {
      if (!menuRef.current) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }

      if (!menuRef.current.contains(target)) {
        onRequestClose();
      }
    };

    window.addEventListener("keydown", onEscape);
    window.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onEscape);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open, onRequestClose]);

  const fixedStyle = useMemo(() => {
    if (!position || typeof window === "undefined") {
      return undefined;
    }

    const menuWidth = 160;
    const estimatedHeight = Math.max(40, items.length * 34 + (extraContent ? 74 : 8));
    const margin = 8;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const x = Math.max(margin, Math.min(position.x, viewportWidth - menuWidth - margin));
    const canOpenDown = position.y + estimatedHeight + margin <= viewportHeight;
    const y = canOpenDown
      ? Math.max(margin, position.y)
      : Math.max(margin, Math.min(position.y - estimatedHeight, viewportHeight - estimatedHeight - margin));

    return {
      position: "fixed" as const,
      left: x,
      top: y,
      zIndex: 120,
      width: `${menuWidth}px`,
    };
  }, [extraContent, items.length, position]);

  if (!open) {
    return null;
  }

  const content = (
    <div
      ref={menuRef}
      className={
        className ||
        "motion-interactive absolute right-0 top-full mt-1 z-20 w-40 overflow-hidden rounded-lg border border-orion-border bg-slate-900 shadow-xl dark:border-orion-dark-border"
      }
      data-row-menu="true"
      style={fixedStyle}
    >
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          disabled={item.disabled}
          title={item.hint}
          onClick={(event) => {
            event.stopPropagation();
            if (item.disabled) {
              return;
            }
            item.onSelect(event);
          }}
          className={
            item.disabled
              ? "w-full px-3 py-2 text-left text-xs text-slate-500 cursor-not-allowed"
              : item.tone === "danger"
                ? "w-full px-3 py-2 text-left text-xs text-red-300 hover:bg-red-500/10"
                : "w-full px-3 py-2 text-left text-xs text-white hover:bg-slate-800"
          }
        >
          {item.label}
        </button>
      ))}
      {extraContent ? <div className="border-t border-slate-700/80 px-2 py-2">{extraContent}</div> : null}
    </div>
  );

  if (!position) {
    return content;
  }

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(content, document.body);
}
