"use client";

import * as React from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface Props {
  label: string;
  options: string[];
  value: string[];
  onChange: (value: string[]) => void;
  hint?: string;
  className?: string;
}

export function MultiSelect({ label, options, value, onChange, hint, className }: Props) {
  const [query, setQuery] = React.useState("");
  const filtered = React.useMemo(
    () => options.filter((o) => o.toLowerCase().includes(query.trim().toLowerCase())),
    [options, query]
  );

  const toggle = (opt: string) =>
    onChange(value.includes(opt) ? value.filter((v) => v !== opt) : [...value, opt]);

  const summary =
    value.length === 0 ? "Todos" : value.length === 1 ? value[0] : `${value.length} selecionados`;

  return (
    <Popover onOpenChange={(o) => !o && setQuery("")}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          title={hint}
          className={cn("h-9 w-full justify-between gap-2 px-3 font-normal sm:w-auto sm:min-w-[11rem]", className)}
        >
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="text-xs text-muted-foreground">{label}:</span>
            <span className={cn("truncate text-sm max-w-[10rem]", value.length > 0 && "font-medium text-foreground")}>
              {summary}
            </span>
          </span>
          <ChevronDown className="size-4 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(22rem,90vw)]">
        <div className="relative mb-2">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Buscar ${label.toLowerCase()}…`}
            className="pl-8"
            aria-label={`Buscar ${label}`}
          />
        </div>
        <div className="max-h-64 overflow-y-auto scrollbar-thin" role="listbox" aria-multiselectable="true">
          {filtered.length === 0 && (
            <p className="px-2 py-6 text-center text-xs text-muted-foreground">Nenhuma opção encontrada</p>
          )}
          {filtered.map((opt) => {
            const selected = value.includes(opt);
            return (
              <button
                key={opt}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => toggle(opt)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
              >
                <span
                  className={cn(
                    "flex size-4 shrink-0 items-center justify-center rounded border",
                    selected ? "border-primary bg-primary text-primary-foreground" : "border-input"
                  )}
                >
                  {selected && <Check className="size-3" />}
                </span>
                <span className="break-words">{opt}</span>
              </button>
            );
          })}
        </div>
        {value.length > 0 && (
          <div className="mt-2 flex justify-end border-t pt-2">
            <Button variant="ghost" size="sm" onClick={() => onChange([])}>
              <X /> Limpar
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
