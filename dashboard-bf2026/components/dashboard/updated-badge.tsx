"use client";

import * as React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useDashboard } from "./dashboard-provider";

export function UpdatedBadge() {
  const { data, error, isValidating, isLoading, refresh } = useDashboard();
  const [now, setNow] = React.useState<number | null>(null);

  React.useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  if (isLoading && !data) {
    return (
      <Badge variant="secondary" className="gap-1.5">
        <RefreshCw className="size-3 animate-spin" /> Carregando…
      </Badge>
    );
  }

  if (error && !data) {
    return (
      <Badge variant="destructive" className="gap-1.5">
        <AlertTriangle className="size-3" /> Sem conexão com a planilha
      </Badge>
    );
  }

  const minutes =
    data && now !== null ? Math.max(0, Math.floor((now - new Date(data.generatedAt).getTime()) / 60000)) : 0;

  return (
    <button
      type="button"
      onClick={refresh}
      title="Clique para atualizar agora"
      className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Badge variant={error ? "warning" : "success"} className="cursor-pointer gap-1.5">
        {error ? (
          <AlertTriangle className="size-3" />
        ) : (
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60" />
            <span className="relative inline-flex size-2 rounded-full bg-success" />
          </span>
        )}
        <span className="tabular">
          {error ? "Falha ao atualizar · " : ""}
          Atualizado há {minutes} min
        </span>
        <RefreshCw className={cn("size-3", isValidating && "animate-spin")} />
      </Badge>
    </button>
  );
}
