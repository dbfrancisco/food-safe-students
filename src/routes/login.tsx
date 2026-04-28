import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { ShieldPlus } from "lucide-react";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

const schema = z.object({
  email: z.string().trim().email("Email inválido").max(255),
  password: z.string().min(6, "Senha mínima de 6 caracteres").max(72),
  fullName: z.string().trim().max(120).optional(),
});

function LoginPage() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (session) navigate({ to: "/dashboard" });
  }, [session, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password, fullName });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: { full_name: parsed.data.fullName ?? "" },
          },
        });
        if (error) throw error;
        toast.success("Conta criada com sucesso");
        navigate({ to: "/dashboard" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: parsed.data.email,
          password: parsed.data.password,
        });
        if (error) throw error;
        toast.success("Login realizado");
        navigate({ to: "/dashboard" });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro inesperado";
      if (msg.toLowerCase().includes("invalid login")) {
        toast.error("Email ou senha incorretos");
      } else if (msg.toLowerCase().includes("already registered") || msg.toLowerCase().includes("already been registered")) {
        toast.error("Este email já está cadastrado");
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handlePasswordReset() {
    if (!email) {
      toast.error("Digite seu email primeiro");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) toast.error(error.message);
    else toast.success("Email de recuperação enviado");
  }

  return (
    <div className="min-h-dvh flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 text-2xl font-bold tracking-tighter">
            <div className="size-8 bg-foreground text-background flex items-center justify-center">
              <ShieldPlus className="size-4" />
            </div>
            DIETASAFE<span className="font-light opacity-40 italic data-mono text-base">v1.0</span>
          </div>
          <p className="medical-label mt-3">Sistema de Controle Alimentar Escolar</p>
        </div>

        <div className="bg-card clinical-border p-8">
          <div className="medical-label mb-1">{mode === "login" ? "Acesso Restrito" : "Novo Administrador"}</div>
          <h2 className="text-2xl font-bold mb-6">
            {mode === "login" ? "Login Administrativo" : "Cadastro de Conta"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div>
                <label className="medical-label block mb-2">Nome Completo</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
                  placeholder="Seu nome"
                />
              </div>
            )}
            <div>
              <label className="medical-label block mb-2">Email Institucional</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
                placeholder="admin@escola.edu.br"
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="medical-label">Senha</label>
                {mode === "login" && (
                  <button
                    type="button"
                    onClick={handlePasswordReset}
                    className="text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
                  >
                    Recuperar
                  </button>
                )}
              </div>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-foreground text-background py-3 text-xs font-bold uppercase tracking-widest hover:bg-foreground/90 disabled:opacity-50 transition-colors"
            >
              {loading ? "Processando..." : mode === "login" ? "Acessar Sistema" : "Criar Conta"}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-border text-center">
            <button
              onClick={() => setMode(mode === "login" ? "signup" : "login")}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              {mode === "login" ? "Não possui conta? Cadastre-se" : "Já possui conta? Faça login"}
            </button>
          </div>
        </div>

        <p className="text-center text-[10px] uppercase tracking-widest text-muted-foreground mt-6 data-mono">
          Acesso restrito a administradores escolares
        </p>
      </div>
    </div>
  );
}
