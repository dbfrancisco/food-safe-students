import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { Users, AlertTriangle, ShieldAlert, Plus, FileText } from "lucide-react";
import { SeverityBadge } from "@/components/SeverityBadge";
import type { Severity } from "@/lib/severity";

export const Route = createFileRoute("/dashboard")({
  component: () => (
    <RequireAuth>
      <Dashboard />
    </RequireAuth>
  ),
});

interface RecentRow {
  id: string;
  name: string;
  severity: Severity;
  student_id: string;
  student_name: string;
  class_name: string;
}

function Dashboard() {
  const [stats, setStats] = useState({ total: 0, withRestrictions: 0, critical: 0 });
  const [recent, setRecent] = useState<RecentRow[]>([]);
  const [lastSync, setLastSync] = useState<string>("");

  useEffect(() => {
    async function load() {
      const [{ count: total }, allergies] = await Promise.all([
        supabase.from("students").select("*", { count: "exact", head: true }),
        supabase
          .from("allergies")
          .select("id, name, severity, student_id, students(full_name, class_name)")
          .order("created_at", { ascending: false }),
      ]);
      const rows = (allergies.data ?? []) as Array<{
        id: string; name: string; severity: Severity; student_id: string;
        students: { full_name: string; class_name: string } | null;
      }>;
      const studentIds = new Set(rows.map(r => r.student_id));
      const critical = rows.filter(r => r.severity === "grave").length;
      setStats({ total: total ?? 0, withRestrictions: studentIds.size, critical });
      setRecent(
        rows.slice(0, 6).map(r => ({
          id: r.id,
          name: r.name,
          severity: r.severity,
          student_id: r.student_id,
          student_name: r.students?.full_name ?? "—",
          class_name: r.students?.class_name ?? "—",
        }))
      );
      setLastSync(new Date().toLocaleString("pt-BR"));
    }
    load();
  }, []);

  return (
    <AppShell
      title="Painel Central"
      subtitle={`Última sincronização: ${lastSync || "—"}`}
      actions={
        <>
          <Link
            to="/alunos/novo"
            className="px-4 py-2 text-xs font-bold uppercase tracking-widest border border-foreground hover:bg-foreground hover:text-background transition-colors flex items-center gap-2"
          >
            <Plus className="size-3" /> Cadastrar Aluno
          </Link>
          <Link
            to="/relatorio"
            className="px-4 py-2 text-xs font-bold uppercase tracking-widest bg-foreground text-background hover:bg-foreground/90 flex items-center gap-2"
          >
            <FileText className="size-3" /> Gerar Relatório
          </Link>
        </>
      }
    >
      <div className="space-y-8 max-w-7xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard label="Total Alunos Matriculados" value={stats.total} icon={Users} />
          <StatCard
            label="Com Restrição Ativa"
            value={stats.withRestrictions}
            icon={AlertTriangle}
            accent="border-l-severity-moderate"
            note="Requer protocolo especial"
            noteColor="text-severity-moderate"
          />
          <StatCard
            label="Casos de Gravidade Alta"
            value={stats.critical}
            icon={ShieldAlert}
            accent="border-l-severity-severe"
            note="Atenção imediata"
            noteColor="text-severity-severe"
          />
        </div>

        <div className="bg-card clinical-border">
          <div className="px-6 py-4 border-b border-border flex justify-between items-center">
            <div>
              <div className="medical-label">Atualizações Recentes</div>
              <h2 className="font-bold text-lg">Últimas restrições registradas</h2>
            </div>
            <Link to="/alunos" className="text-xs font-bold uppercase tracking-widest underline">
              Ver todos
            </Link>
          </div>
          {recent.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="medical-label mb-2">Sem registros</p>
              <p className="text-sm text-muted-foreground">
                Cadastre o primeiro aluno para começar.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[640px]">
              <thead className="bg-muted/30">
                <tr className="border-b border-border">
                  <th className="px-6 py-3 medical-label">Aluno</th>
                  <th className="px-6 py-3 medical-label">Turma</th>
                  <th className="px-6 py-3 medical-label">Restrição</th>
                  <th className="px-6 py-3 medical-label">Gravidade</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {recent.map(r => (
                  <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-6 py-4 font-bold">{r.student_name}</td>
                    <td className="px-6 py-4 text-muted-foreground">{r.class_name}</td>
                    <td className="px-6 py-4">
                      <span className="bg-muted px-2 py-0.5 rounded-sm text-xs font-medium">{r.name}</span>
                    </td>
                    <td className="px-6 py-4"><SeverityBadge level={r.severity} /></td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        to="/alunos/$id"
                        params={{ id: r.student_id }}
                        className="text-xs underline font-bold tracking-tight hover:text-muted-foreground"
                      >
                        Prontuário
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function StatCard({
  label, value, icon: Icon, accent, note, noteColor,
}: {
  label: string; value: number; icon: React.ComponentType<{ className?: string }>;
  accent?: string; note?: string; noteColor?: string;
}) {
  return (
    <div className={`bg-card p-5 clinical-border relative overflow-hidden ${accent ? `border-l-4 ${accent}` : ""}`}>
      <div className="medical-label mb-1">{label}</div>
      <div className="text-3xl font-bold tabular-nums data-mono">{value}</div>
      {note && (
        <div className={`text-[10px] font-bold mt-1 uppercase tracking-tighter ${noteColor ?? ""}`}>
          {note}
        </div>
      )}
      <div className="absolute top-3 right-3 opacity-10">
        <Icon className="size-10" />
      </div>
    </div>
  );
}
