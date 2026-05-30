import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { ShieldPlus, X } from "lucide-react";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

const schema = z.object({
  email: z.string().trim().email("Email inválido").max(255),
  password: z.string().min(6, "Senha mínima de 6 caracteres").max(72),
  fullName: z.string().trim().max(120).optional(),
});

const EMAIL_HISTORY_KEY = "login_email_history";

function getEmailHistory(): string[] {
  try {
    const raw = localStorage.getItem(EMAIL_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((e) => typeof e === "string") : [];
  } catch {
    return [];
  }
}

function saveEmailToHistory(email: string) {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return;
  const history = getEmailHistory();
  const updated = [normalized, ...history.filter((e) => e !== normalized)].slice(0, 10);
  localStorage.setItem(EMAIL_HISTORY_KEY, JSON.stringify(updated));
}

function removeEmailFromHistory(email: string) {
  const normalized = email.trim().toLowerCase();
  const history = getEmailHistory();
  const updated = history.filter((e) => e !== normalized);
  localStorage.setItem(EMAIL_HISTORY_KEY, JSON.stringify(updated));
}

function EmailHistoryDropdown({
  history,
  onSelect,
  onRemove,
}: {
  history: string[];
  onSelect: (email: string) => void;
  onRemove: (email: string) => void;
}) {
  if (history.length === 0) return null;
  return (
    <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-card clinical-border shadow-lg max-h-52 overflow-y-auto">
      <div className="medical-label px-3 pt-2 pb-1 border-b border-border">Emails usados anteriormente</div>
      {history.map((item) => (
        <div
          key={item}
          className="flex items-center justify-between px-3 py-2 hover:bg-accent cursor-pointer group"
          onMouseDown={(e) => {
            e.preventDefault();
            onSelect(item);
          }}
        >
          <span className="text-sm truncate">{item}</span>
          <button
            type="button"
            onMouseDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onRemove(item);
            }}
            className="opacity-0 group-hover:opacity-100 p-1 hover:text-destructive transition-opacity"
            title="Remover do histórico"
          >
            <X className="size-3" />
          </button>
        </div>
      ))}
    </div>
  );
}

function LoginPage() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [emailHistory, setEmailHistory] = useState<string[]>([]);
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (session) navigate({ to: "/dashboard" });
  }, [session, navigate]);

  useEffect(() => {
    setEmailHistory(getEmailHistory());
  }, []);

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
        saveEmailToHistory(parsed.data.email);
        toast.success("Conta criada com sucesso");
        navigate({ to: "/dashboard" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: parsed.data.email,
          password: parsed.data.password,
        });
        if (error) throw error;
        saveEmailToHistory(parsed.data.email);
        toast.success("Login realizado");
        navigate({ to: "/dashboard" });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro inesperado";
      if (msg.toLowerCase().includes("invalid login")) {
        toast.error("Email ou senha incorretos");
      } else if (
        msg.toLowerCase().includes("already registered") ||
        msg.toLowerCase().includes("already been registered")
      ) {
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

  function handleSelectHistoryItem(item: string) {
    setEmail(item);
    setHistoryOpen(false);
    setTimeout(() => {
      document.getElementById("login-password")?.focus();
    }, 0);
  }

  function handleRemoveHistoryItem(item: string) {
    removeEmailFromHistory(item);
    setEmailHistory(getEmailHistory());
  }

  const filteredHistory = email
    ? emailHistory.filter((h) => h.toLowerCase().startsWith(email.toLowerCase()) && h !== email.toLowerCase())
    : emailHistory;

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
            <div className="relative">
              <label className="medical-label block mb-2">Email Institucional</label>
              <input
                ref={emailRef}
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setHistoryOpen(true)}
                onBlur={() => {
                  setTimeout(() => setHistoryOpen(false), 150);
                }}
                className="w-full bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
                placeholder="admin@escola.edu.br"
              />
              {historyOpen && (
                <EmailHistoryDropdown
                  history={filteredHistory}
                  onSelect={handleSelectHistoryItem}
                  onRemove={handleRemoveHistoryItem}
                />
              )}
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
                id="login-password"
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
