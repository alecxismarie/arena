"use client";

import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type BrandSelectOption = {
  value: string;
  label: string;
};

type BrandSelectProps = {
  name: string;
  options: BrandSelectOption[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  emptyMessage?: string;
  className?: string;
};

export function BrandSelect({
  name,
  options,
  value,
  defaultValue,
  onChange,
  placeholder,
  emptyMessage = "No options available",
  className,
}: BrandSelectProps) {
  const [open, setOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [uncontrolledValue, setUncontrolledValue] = useState(
    defaultValue ?? value ?? options[0]?.value ?? "",
  );

  const selectedValue = value ?? uncontrolledValue;

  const selectedLabel = useMemo(() => {
    if (!selectedValue && placeholder) {
      return placeholder;
    }
    return (
      options.find((option) => option.value === selectedValue)?.label ??
      selectedValue
    );
  }, [options, placeholder, selectedValue]);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("click", handleClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("click", handleClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  useEffect(() => {
    if (!open) return;

    function updateMenuDirection() {
      if (!rootRef.current) return;
      const rect = rootRef.current.getBoundingClientRect();
      const estimatedMenuHeight = 236;
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      setOpenUpward(spaceBelow < estimatedMenuHeight && spaceAbove > spaceBelow);
    }

    updateMenuDirection();
    window.addEventListener("resize", updateMenuDirection);
    window.addEventListener("scroll", updateMenuDirection, true);
    return () => {
      window.removeEventListener("resize", updateMenuDirection);
      window.removeEventListener("scroll", updateMenuDirection, true);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <input type="hidden" name={name} value={selectedValue} />

      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-left text-foreground outline-none transition focus-visible:border-accent/70 focus-visible:ring-2 focus-visible:ring-accent/10",
          open && "border-accent/70 ring-2 ring-accent/10",
        )}
      >
        <span className="flex items-center justify-between gap-2">
          <span
            className={cn(
              "truncate",
              !selectedValue && placeholder && "text-muted-foreground",
            )}
          >
            {selectedLabel}
          </span>
          <ChevronDown
            className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")}
          />
        </span>
      </button>

      {open ? (
        <ul
          role="listbox"
          className={cn(
            "absolute z-[120] max-h-56 w-full overflow-auto rounded-xl border border-border bg-card p-1 shadow-[0_10px_24px_-18px_rgba(84,45,14,0.5)]",
            openUpward ? "bottom-full mb-1" : "top-full mt-1",
          )}
        >
          {options.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted-foreground">{emptyMessage}</li>
          ) : (
            options.map((option) => {
              const active = option.value === selectedValue;

              return (
                <li key={option.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => {
                      if (value === undefined) {
                        setUncontrolledValue(option.value);
                      }
                      onChange?.(option.value);
                      setOpen(false);
                    }}
                    className={cn(
                      "w-full rounded-lg px-3 py-2 text-left text-sm transition-colors",
                      active
                        ? "bg-accent text-accent-foreground"
                        : "text-foreground hover:bg-accent/20",
                    )}
                  >
                    {option.label}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      ) : null}
    </div>
  );
}
