import { createRouter, useRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

function DefaultErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center clinical-border bg-card p-8">
        <div className="medical-label text-destructive mb-2">Erro do Sistema</div>
        <h1 className="text-2xl font-bold">Algo deu errado</h1>
        <p className="mt-2 text-sm text-muted-foreground">Ocorreu um erro inesperado.</p>
        {import.meta.env.DEV && error.message && (
          <pre className="mt-4 max-h-40 overflow-auto bg-muted p-3 text-left data-mono text-xs text-destructive">
            {error.message}
          </pre>
        )}
        <button
          onClick={() => { router.invalidate(); reset(); }}
          className="mt-6 px-4 py-2 bg-foreground text-background text-xs font-bold uppercase tracking-widest"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  );
}

export const getRouter = () => {
  return createRouter({
    routeTree,
    context: {},
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    defaultErrorComponent: DefaultErrorComponent,
  });
};
