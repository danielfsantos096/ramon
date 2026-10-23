import { AppHeader } from "@/components/dashboard/app-header";
import { DashboardProvider } from "@/components/dashboard/dashboard-provider";
import { FilterBar } from "@/components/dashboard/filter-bar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardProvider>
      <AppHeader />
      <main className="mx-auto max-w-[1400px] space-y-4 px-4 py-4 sm:px-6 sm:py-6">
        <FilterBar />
        {children}
      </main>
      <footer className="mx-auto max-w-[1400px] px-4 pb-8 pt-2 text-center text-[11px] text-muted-foreground sm:px-6">
        Dados da planilha Google Sheets · atualização automática a cada 5 minutos
      </footer>
    </DashboardProvider>
  );
}
