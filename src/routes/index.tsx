import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { session, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background">
        <div className="medical-label">Carregando sistema...</div>
      </div>
    );
  }
  return <Navigate to={session ? "/dashboard" : "/login"} />;
}
