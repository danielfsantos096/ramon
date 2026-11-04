"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Bell, Megaphone, Repeat2, ShoppingCart, Users } from "lucide-react";
import { CAMPAIGN_TITLE } from "@/lib/config";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./theme-toggle";
import { UpdatedBadge } from "./updated-badge";

const NAV = [
  { href: "/", label: "Visão geral", icon: BarChart3 },
  { href: "/meta-ads", label: "Captação", icon: Megaphone },
  { href: "/avisos", label: "Avisos", icon: Bell },
  { href: "/rmkt", label: "RMKT", icon: Repeat2 },
  { href: "/vendas", label: "Hotmart", icon: ShoppingCart },
  { href: "/leads", label: "Análise de Leads", icon: Users },
] as const;

export function AppHeader() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">Ramon Souza</p>
            <h1 className="truncate text-base font-semibold sm:text-lg">{CAMPAIGN_TITLE}</h1>
          </div>
          <div className="flex items-center gap-2 lg:hidden">
            <ThemeToggle />
          </div>
        </div>

        <nav aria-label="Seções" className="-mx-1 flex gap-1 overflow-x-auto px-1 scrollbar-thin">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2 whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground shadow"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <Icon className="size-4" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <UpdatedBadge />
          <div className="hidden lg:block">
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
