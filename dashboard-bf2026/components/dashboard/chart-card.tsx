"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { BarChart3 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function EmptyState({
  title = "Sem dados ainda",
  description = "Quando houver dados para o período e filtros selecionados, eles aparecem aqui.",
  className,
}: {
  title?: string;
  description?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 px-4 py-10 text-center", className)}>
      <div className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <BarChart3 className="size-5" />
      </div>
      <p className="text-sm font-medium">{title}</p>
      <p className="max-w-xs text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

interface Props {
  title: string;
  description?: string;
  empty?: boolean;
  className?: string;
  contentClassName?: string;
  action?: React.ReactNode;
  index?: number;
  children: React.ReactNode;
}

export function ChartCard({ title, description, empty, className, contentClassName, action, index = 0, children }: Props) {
  return (
    <motion.div
      className={cn("min-w-0", className)}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 + index * 0.05, ease: "easeOut" }}
    >
      <Card className="h-full">
        <CardHeader className="flex-row items-start justify-between gap-2 space-y-0">
          <div className="min-w-0 space-y-1">
            <CardTitle>{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          {action}
        </CardHeader>
        <CardContent className={contentClassName}>{empty ? <EmptyState /> : children}</CardContent>
      </Card>
    </motion.div>
  );
}
