import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, Users, FileText, LogOut, ShieldPlus } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import type { ReactNode } from "react";

const nav = [
  { to: "/dashboard", label: "Painel Central", icon: LayoutDashboard },
  { to: "/alunos", label: "Alunos & Restrições", icon: Users },
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

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/login" });
  };

  return (
    <div className="flex min-h-dvh">
      <aside className="w-64 bg-card border-r border-border flex flex-col shrink-0 no-print">
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="size-5 bg-foreground flex items-center justify-center text-[11px] text-background font-bold">
              <ShieldPlus className="size-3" />
            </div>
            <span className="font-bold tracking-tighter text-lg">
              DIETASAFE<span className="font-light opacity-40 italic data-mono">v1.0</span>
            </span>
          </div>
        </div>
        <nav className="p-4 space-y-1 flex-1">
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
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="bg-card border-b border-border px-8 py-4 flex items-center justify-between no-print">
          <div>
            <h1 className="text-xl font-bold tracking-tight">{title}</h1>
            {subtitle && <p className="text-xs text-muted-foreground data-mono mt-0.5">{subtitle}</p>}
          </div>
          {actions && <div className="flex gap-3">{actions}</div>}
        </header>
        <div className="p-8 flex-1">{children}</div>
      </main>
    </div>
  );
}
