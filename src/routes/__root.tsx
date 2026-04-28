import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth-context";
import { Toaster } from "@/components/ui/sonner";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center clinical-border bg-card p-8">
        <div className="medical-label text-muted-foreground">Erro 404</div>
        <h1 className="text-7xl font-bold mt-2 data-mono">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Registro não encontrado</h2>
        <p className="mt-2 text-sm text-muted-foreground">A página solicitada não existe.</p>
        <Link
          to="/"
          className="mt-6 inline-block px-4 py-2 bg-foreground text-background text-xs font-bold uppercase tracking-widest"
        >
          Ir para início
        </Link>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "DietaSafe — Gerenciamento de Restrições Alimentares" },
      { name: "description", content: "Sistema escolar para gestão segura de restrições e alergias alimentares de alunos." },
      { property: "og:title", content: "DietaSafe — Restrições Alimentares Escolares" },
      { property: "og:description", content: "Cadastro e controle de alergias alimentares dos alunos." },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;700&family=IBM+Plex+Sans:wght@300;400;500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <AuthProvider>
      <Outlet />
      <Toaster />
    </AuthProvider>
  );
}
