import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handle(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Senha mínima de 6 caracteres");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Senha atualizada");
      navigate({ to: "/dashboard" });
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center bg-background p-4">
      <form onSubmit={handle} className="w-full max-w-md bg-card clinical-border p-8 space-y-4">
        <div className="medical-label">Recuperação de Senha</div>
        <h1 className="text-2xl font-bold">Definir nova senha</h1>
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Nova senha"
          className="w-full bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
        />
        <button
          disabled={loading}
          className="w-full bg-foreground text-background py-3 text-xs font-bold uppercase tracking-widest disabled:opacity-50"
        >
          {loading ? "Salvando..." : "Atualizar Senha"}
        </button>
      </form>
    </div>
  );
}
