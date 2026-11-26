"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search, Tag, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchableCategorySelectProps {
  categories: string[];
  value: string;
  onChange: (category: string) => void;
  counts?: Record<string, number>;
  className?: string;
}

function normalizeText(input: string) {
  return input
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

export function SearchableCategorySelect({
  categories,
  value,
  onChange,
  counts,
  className,
}: SearchableCategorySelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = normalizeText(query);
    if (!q) return categories;
    return categories.filter((category) => {
      const displayLabel = category === "Todas" ? "Todas las categorías" : category;
      return normalizeText(displayLabel).includes(q) || normalizeText(category).includes(q);
    });
  }, [categories, query]);

  const activeIndex = Math.min(highlightedIndex, Math.max(0, filtered.length - 1));

  useEffect(() => {
    if (!open) return;
    searchInputRef.current?.focus();

    function handleMouseDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleMouseDown);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
    };
  }, [open]);

  const handleToggle = () => {
    setOpen((prev) => {
      const next = !prev;
      if (next) {
        setQuery("");
        setHighlightedIndex(0);
      }
      return next;
    });
  };

  const handleSelect = (category: string) => {
    onChange(category);
    setOpen(false);
    setQuery("");
    triggerRef.current?.focus();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (filtered.length > 0) {
        setHighlightedIndex((prev) => Math.min(filtered.length - 1, Math.min(prev, filtered.length - 1) + 1));
      }
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (filtered.length > 0) {
        setHighlightedIndex((prev) => Math.max(0, Math.min(prev, filtered.length - 1) - 1));
      }
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const chosen = filtered[activeIndex];
      if (chosen) {
        handleSelect(chosen);
      }
    }
  };

  const selectedLabel = value === "Todas" ? "Todas las categorías" : value;

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Filtrar por categoría"
        className={cn(
          "h-10 w-full rounded-xl bg-admin-raised border px-3 text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer",
          value !== "Todas"
            ? "border-admin-brand/50 text-admin-text font-semibold"
            : "border-admin-card-border text-admin-secondary font-medium hover:border-admin-brand/40"
        )}
      >
        <span className="flex items-center gap-2 min-w-0">
          <Tag className="h-3.5 w-3.5 text-admin-brand-text shrink-0" />
          <span className="truncate">{selectedLabel}</span>
        </span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-slate-400 shrink-0 transition-transform duration-150",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div className="absolute left-0 sm:left-auto sm:right-0 z-40 mt-1.5 w-full sm:w-72 rounded-xl border border-admin-card-border bg-admin-card-bg shadow-lg overflow-hidden">
          <div className="p-2 border-b border-admin-card-border">
            <div className="relative">
              <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setHighlightedIndex(0);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Buscar categoría..."
                aria-label="Buscar categoría"
                className="h-8 w-full rounded-lg border border-admin-card-border bg-admin-raised pl-8 pr-7 text-xs text-admin-text placeholder:text-slate-400 focus:outline-none focus:border-admin-brand"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setHighlightedIndex(0);
                    searchInputRef.current?.focus();
                  }}
                  aria-label="Limpiar búsqueda de categoría"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-admin-text p-0.5 cursor-pointer"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          <ul
            role="listbox"
            aria-label="Categorías disponibles"
            className="max-h-60 overflow-y-auto p-1 custom-scrollbar"
          >
            {filtered.length === 0 ? (
              <li className="px-3 py-4 text-center text-xs text-admin-muted">
                No se encontraron categorías
              </li>
            ) : (
              filtered.map((category, index) => {
                const isSelected = category === value;
                const isHighlighted = index === activeIndex;
                const label = category === "Todas" ? "Todas las categorías" : category;
                const count = counts?.[category];

                return (
                  <li key={category} role="option" aria-selected={isSelected}>
                    <button
                      type="button"
                      onMouseEnter={() => setHighlightedIndex(index)}
                      onClick={() => handleSelect(category)}
                      className={cn(
                        "w-full flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-xs text-left transition-colors cursor-pointer",
                        isSelected
                          ? "bg-admin-brand-subtle text-admin-brand-text font-semibold"
                          : isHighlighted
                          ? "bg-admin-raised text-admin-text"
                          : "text-admin-secondary hover:bg-admin-raised"
                      )}
                    >
                      <span className="truncate">{label}</span>
                      <span className="flex items-center gap-2 shrink-0">
                        {typeof count === "number" && (
                          <span className="text-[11px] text-admin-muted tabular-nums">
                            {count}
                          </span>
                        )}
                        {isSelected && <Check className="h-3.5 w-3.5 text-admin-brand-text" />}
                      </span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
