"use client";

import * as React from "react";
import { AlertTriangle, Info, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboard } from "./dashboard-provider";

export function PageSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Carregando dados">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="p-4 sm:p-5">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-3 h-8 w-28" />
            <Skeleton className="mt-3 h-4 w-16" />
          </Card>
        ))}
      </div>
      <Card className="p-5">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="mt-4 h-72 w-full" />
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="mt-4 h-56 w-full" />
        </Card>
        <Card className="p-5">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="mt-4 h-56 w-full" />
        </Card>
      </div>
    </div>
  );
}

function ErrorState({ message, code }: { message: string; code?: string }) {
  const { refresh, isValidating } = useDashboard();
  return (
    <Card className="mx-auto mt-10 flex max-w-lg flex-col items-center gap-3 p-8 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-destructive/15 text-destructive">
        <AlertTriangle className="size-6" />
      </div>
      <h2 className="text-base font-semibold">Não foi possível carregar os dados</h2>
      <p className="text-sm text-muted-foreground">{message}</p>
      {code === "CONFIG" && (
        <p className="text-xs text-muted-foreground">
          Confira o <code className="rounded bg-muted px-1">.env</code> (veja o README) ou use{" "}
          <code className="rounded bg-muted px-1">DEMO_MODE=true</code> para pré-visualizar.
        </p>
      )}
      <Button variant="outline" onClick={refresh} disabled={isValidating}>
        <RefreshCw className={isValidating ? "animate-spin" : ""} /> Tentar novamente
      </Button>
    </Card>
  );
}

/** Mostra skeleton/erro e, quando há dados, avisos de normalização + conteúdo. */
export function PageGate({ children }: { children: React.ReactNode }) {
  const { data, error, isLoading } = useDashboard();

  if (!data && isLoading) return <PageSkeleton />;
  if (!data && error) return <ErrorState message={error.message} code={error.code} />;
  if (!data) return <PageSkeleton />;

  return (
    <div className="space-y-4">
      {data.demo && (
        <div className="flex items-center gap-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
          <Info className="size-4 shrink-0" /> Modo demonstração: os dados abaixo são fictícios (DEMO_MODE=true).
        </div>
      )}
      {children}
      {data.warnings.length > 0 && (
        <details className="rounded-lg border border-border/70 bg-card/50 px-3 py-2 text-xs text-muted-foreground">
          <summary className="cursor-pointer select-none font-medium">
            {data.warnings.length} aviso(s) de qualidade de dados
          </summary>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {data.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
