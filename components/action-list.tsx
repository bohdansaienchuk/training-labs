"use client";

import Image from "next/image";
import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";
import { createPortal } from "react-dom";

export type ActionListItem<Action extends string> = {
  action: Action;
  label: string;
  icon: string;
  disabled?: boolean;
};

export function ActionList<Action extends string>({ id, label, items, anchor, selectionList, selectionSelector, onAction, onClose }: {
  id: string;
  label: string;
  items: readonly ActionListItem<Action>[];
  anchor: RefObject<HTMLButtonElement | null>;
  selectionList: RefObject<HTMLElement | null>;
  selectionSelector: string;
  onAction: (action: Action) => void;
  onClose: () => void;
}) {
  const menu = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    function positionMenu() {
      if (!anchor.current || !menu.current) return;
      const rect = anchor.current.getBoundingClientRect();
      const left = Math.max(8, Math.min(rect.right - 200, window.innerWidth - 208));
      const estimatedHeight = items.length * 44 + Math.max(0, items.length - 1) * 10 + 20;
      const height = menu.current.offsetHeight || estimatedHeight;
      const top = Math.max(8, Math.min(rect.bottom + 8, window.innerHeight - height - 8));
      menu.current.style.left = `${left}px`;
      menu.current.style.top = `${top}px`;
    }
    positionMenu();
    window.addEventListener("resize", positionMenu);
    window.addEventListener("scroll", positionMenu, true);
    return () => {
      window.removeEventListener("resize", positionMenu);
      window.removeEventListener("scroll", positionMenu, true);
    };
  }, [anchor, items.length]);

  useEffect(() => {
    menu.current?.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus();
  }, []);

  useEffect(() => {
    function outside(event: PointerEvent) {
      const row = event.target instanceof Element ? event.target.closest(selectionSelector) : null;
      if (row && selectionList.current?.contains(row)) return;
      if (!menu.current?.contains(event.target as Node) && !anchor.current?.contains(event.target as Node)) onClose();
    }
    function escape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onClose();
      anchor.current?.focus();
    }
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [anchor, onClose, selectionList, selectionSelector]);

  return createPortal(
    <div ref={menu} id={id} role="menu" aria-label={label}
      onKeyDown={(event) => {
        if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); onClose(); anchor.current?.focus(); }
        if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
          event.preventDefault();
          const buttons = Array.from(menu.current!.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"));
          if (!buttons.length) return;
          const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
          const next = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : (index + (event.key === "ArrowDown" ? 1 : -1) + buttons.length) % buttons.length;
          buttons[next]?.focus();
        }
      }}
      className="fixed z-50 flex w-[200px] flex-col gap-2.5 rounded-12 bg-neutral-50 p-2.5 text-[#000000]">
      {items.map(({ action, label: itemLabel, icon, disabled }) => (
        <button key={action} type="button" role="menuitem" disabled={disabled} onClick={() => onAction(action)}
          className="type-body-m flex h-11 w-[180px] shrink-0 items-center gap-2.5 rounded-8 p-2.5 text-left disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-primary-700">
          <span aria-hidden="true" className="flex size-6 shrink-0 items-center justify-center"><Image src={icon} alt="" width={22} height={22} unoptimized /></span>
          <span>{itemLabel}</span>
        </button>
      ))}
    </div>, document.body,
  );
}
