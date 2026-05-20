import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, Users, FileText, LogOut, ShieldPlus, Menu, X, Utensils } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useEffect, useState, type ReactNode } from "react";

const nav = [
  { to: "/dashboard", label: "Painel Central", icon: LayoutDashboard },
  { to: "/alunos", label: "Alunos & Restrições", icon: Users },
  { to: "/resumo-alimentar", label: "Resumo Alimentar Escolar", icon: Utensils },
  { to: "/relatorio", label: "Relatórios", icon: FileText },
];

export function AppShell({ children, title, subtitle, actions }: {
  children: ReactNode;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close drawer on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/login" });
  };

  const SidebarContent = (
    <>
      <div className="p-6 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="size-5 bg-foreground flex items-center justify-center text-[11px] text-background font-bold">
            <ShieldPlus className="size-3" />
          </div>
          <span className="font-bold tracking-tighter text-lg">
            DIETASAFE<span className="font-light opacity-40 italic data-mono">v1.0</span>
          </span>
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="md:hidden text-muted-foreground hover:text-foreground"
          aria-label="Fechar menu"
        >
          <X className="size-5" />
        </button>
      </div>
      <nav className="p-4 space-y-1 flex-1 overflow-y-auto">
        <div className="medical-label px-2 py-2">Controle Escolar</div>
        {nav.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.to || pathname.startsWith(item.to + "/");
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-2 px-3 py-2 rounded-sm text-sm transition-colors ${
                active
                  ? "bg-accent font-medium text-foreground"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              }`}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-border space-y-2">
        <div className="text-xs text-muted-foreground data-mono truncate">
          {user?.email}
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <LogOut className="size-3" /> Sair do sistema
        </button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-dvh">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 bg-card border-r border-border flex-col shrink-0 no-print">
        {SidebarContent}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 no-print">
          <div
            className="absolute inset-0 bg-foreground/40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-card border-r border-border flex flex-col">
            {SidebarContent}
          </aside>
        </div>
      )}

      <main className="flex-1 flex flex-col min-w-0">
        <header className="bg-card border-b border-border px-4 md:px-8 py-4 flex items-center justify-between gap-3 no-print">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="md:hidden -ml-1 p-1.5 border border-border rounded-sm text-foreground"
              aria-label="Abrir menu"
            >
              <Menu className="size-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-base md:text-xl font-bold tracking-tight truncate">{title}</h1>
              {subtitle && <p className="hidden sm:block text-xs text-muted-foreground data-mono mt-0.5 truncate">{subtitle}</p>}
            </div>
          </div>
          {actions && <div className="flex flex-wrap gap-2 md:gap-3 justify-end shrink-0">{actions}</div>}
        </header>
        <div className="p-4 md:p-8 flex-1 min-w-0">{children}</div>
      </main>
    </div>
  );
}
