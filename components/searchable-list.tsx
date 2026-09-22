"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";

type Option<Value extends string> = { value: Value; label: string };

// Select-only combobox with keyboard/type-ahead search. The closed control uses
// Figma Set Input (23:952); the list reuses the existing primary surface tokens.
export function SearchableList<Value extends string>({ value, options, label, onChange }: {
  value: Value;
  options: readonly Option<Value>[];
  label: string;
  onChange: (value: Value) => void;
}) {
  const listId = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const [anchor, setAnchor] = useState<{ left: number; top: number; width: number } | null>(null);
  const [highlighted, setHighlighted] = useState(0);
  const search = useRef({ text: "", time: 0 });
  const selectedIndex = options.findIndex((option) => option.value === value);

  function open(index = Math.max(0, selectedIndex)) {
    const rect = trigger.current!.getBoundingClientRect();
    const height = Math.min(options.length * 40 + 2, 162);
    setAnchor({ left: rect.left, width: rect.width, top: window.innerHeight - rect.bottom >= height + 4 ? rect.bottom + 4 : Math.max(4, rect.top - height - 4) });
    setHighlighted(index);
  }

  function choose(index: number) {
    if (options[index]) onChange(options[index].value);
    setAnchor(null);
    trigger.current?.focus();
  }

  useEffect(() => {
    if (!anchor) return;
    function outside(event: PointerEvent) {
      if (!trigger.current?.contains(event.target as Node) && !popup.current?.contains(event.target as Node)) setAnchor(null);
    }
    function close(event: Event) {
      if (!popup.current?.contains(event.target as Node)) setAnchor(null);
    }
    document.addEventListener("pointerdown", outside);
    window.addEventListener("resize", close);
    window.addEventListener("scroll", close, true);
    return () => {
      document.removeEventListener("pointerdown", outside);
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [anchor]);

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      const next = event.key === "Home" ? 0 : event.key === "End" ? options.length - 1 : Math.max(0, Math.min(options.length - 1, highlighted + (event.key === "ArrowDown" ? 1 : -1)));
      if (anchor) setHighlighted(next);
      else open(event.key === "Home" || event.key === "End" ? next : Math.max(0, selectedIndex));
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (anchor) choose(highlighted);
      else open();
    } else if (event.key === "Escape") {
      event.preventDefault();
      setAnchor(null);
    } else if (event.key === "Tab") {
      setAnchor(null);
    } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const now = Date.now();
      search.current = { text: (now - search.current.time < 700 ? search.current.text : "") + event.key.toLocaleLowerCase("uk"), time: now };
      const index = options.findIndex((option) => option.label.toLocaleLowerCase("uk").startsWith(search.current.text));
      if (index !== -1) { event.preventDefault(); open(index); }
    }
  }

  return (
    <>
      <button ref={trigger} type="button" role="combobox" aria-label={label} aria-expanded={Boolean(anchor)} aria-haspopup="listbox" aria-controls={anchor ? listId : undefined} aria-activedescendant={anchor ? `${listId}-${highlighted}` : undefined} data-value={value}
        onClick={() => anchor ? setAnchor(null) : open()} onKeyDown={onKeyDown} onBlur={() => setAnchor(null)}
        className="type-body-l h-10 w-full min-w-0 cursor-pointer rounded-8 border border-primary-500 bg-neutral-50 px-2 text-center text-neutral-950 hover:bg-primary-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500">
        {options[selectedIndex]?.label}
      </button>
      {anchor && createPortal(
        <div ref={popup} id={listId} role="listbox" aria-label={label} style={anchor} className="fixed z-50 max-h-[162px] overflow-y-auto rounded-8 border border-primary-500 bg-neutral-50 text-neutral-950 shadow-lg">
          {options.map((option, index) => (
            <div key={option.value} id={`${listId}-${index}`} role="option" aria-selected={value === option.value}
              onPointerDown={(event) => event.preventDefault()} onClick={() => choose(index)} onPointerMove={() => setHighlighted(index)}
              className={`type-body-l flex h-10 cursor-pointer items-center justify-center px-2 ${highlighted === index ? "bg-primary-100" : "bg-neutral-50"}`}>
              {option.label}
            </div>
          ))}
        </div>, document.body,
      )}
    </>
  );
}
