import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { Plus, FileText, Search, Trash2 } from "lucide-react";
import { SeverityBadge } from "@/components/SeverityBadge";
import type { Severity } from "@/lib/severity";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/alunos/")({
  component: () => (
    <RequireAuth>
      <StudentsList />
    </RequireAuth>
  ),
});

interface StudentRow {
  id: string;
  full_name: string;
  class_name: string;
  shift: string;
  birth_date: string;
  allergies: { id: string; name: string; severity: Severity }[];
}

function StudentsList() {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [shiftFilter, setShiftFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("students")
      .select("id, full_name, class_name, shift, birth_date, allergies(id, name, severity)")
      .order("full_name");
    if (error) toast.error(error.message);
    setStudents((data ?? []) as StudentRow[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(id: string) {
    const { error } = await supabase.from("students").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Aluno removido");
      load();
    }
  }

  const classes = useMemo(
    () => Array.from(new Set(students.map(s => s.class_name))).sort(),
    [students]
  );

  const filtered = students.filter(s => {
    if (classFilter && s.class_name !== classFilter) return false;
    if (shiftFilter && s.shift !== shiftFilter) return false;
    if (search && !s.full_name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <AppShell
      title="Alunos & Restrições Alimentares"
      subtitle={`${students.length} alunos no registro · ${filtered.length} listados`}
      actions={
        <>
          <Link
            to="/alunos/novo"
            className="px-4 py-2 text-xs font-bold uppercase tracking-widest bg-foreground text-background hover:bg-foreground/90 flex items-center gap-2"
          >
            <Plus className="size-3" /> Novo Aluno
          </Link>
          <Link
            to="/relatorio"
            className="px-4 py-2 text-xs font-bold uppercase tracking-widest border border-foreground hover:bg-foreground hover:text-background flex items-center gap-2"
          >
            <FileText className="size-3" /> Relatório PDF
          </Link>
        </>
      }
    >
      <div className="space-y-6">
        <div className="bg-muted/40 p-4 clinical-border flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[260px]">
            <label className="medical-label block mb-2">Busca por Nome</label>
            <div className="relative">
              <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Ex: Ana Paula..."
                className="w-full bg-card border border-border pl-10 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
              />
            </div>
          </div>
          <div className="w-48">
            <label className="medical-label block mb-2">Turma</label>
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="w-full bg-card border border-border px-3 py-2 text-sm focus:outline-none"
            >
              <option value="">Todas</option>
              {classes.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="w-48">
            <label className="medical-label block mb-2">Turno</label>
            <select
              value={shiftFilter}
              onChange={(e) => setShiftFilter(e.target.value)}
              className="w-full bg-card border border-border px-3 py-2 text-sm focus:outline-none"
            >
              <option value="">Todos</option>
              <option value="matutino">Matutino</option>
              <option value="vespertino">Vespertino</option>
              <option value="noturno">Noturno</option>
              <option value="integral">Integral</option>
            </select>
          </div>
        </div>

        <div className="bg-card clinical-border overflow-hidden">
          {loading ? (
            <div className="px-6 py-12 text-center medical-label">Carregando registros...</div>
          ) : filtered.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <p className="medical-label mb-2">Nenhum registro encontrado</p>
              <p className="text-sm text-muted-foreground mb-4">
                {students.length === 0
                  ? "Cadastre o primeiro aluno para iniciar."
                  : "Ajuste os filtros para ver outros alunos."}
              </p>
              {students.length === 0 && (
                <Link
                  to="/alunos/novo"
                  className="inline-flex px-4 py-2 text-xs font-bold uppercase tracking-widest bg-foreground text-background"
                >
                  <Plus className="size-3 mr-2" /> Cadastrar Aluno
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[640px]">
              <thead className="bg-muted/30">
                <tr className="border-b border-border">
                  <th className="px-4 py-3 medical-label">Aluno</th>
                  <th className="px-4 py-3 medical-label">Turma · Turno</th>
                  <th className="px-4 py-3 medical-label">Restrições</th>
                  <th className="px-4 py-3 medical-label">Risco Máximo</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {filtered.map(s => {
                  const maxSeverity: Severity | null = s.allergies.length === 0
                    ? null
                    : s.allergies.some(a => a.severity === "grave")
                      ? "grave"
                      : s.allergies.some(a => a.severity === "moderado")
                        ? "moderado"
                        : "leve";
                  return (
                    <tr key={s.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-4">
                        <div className="font-bold">{s.full_name}</div>
                        <div className="text-[10px] data-mono text-muted-foreground">
                          ID: {s.id.slice(0, 8).toUpperCase()}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-muted-foreground">
                        <div>{s.class_name}</div>
                        <div className="text-xs capitalize">{s.shift}</div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-1">
                          {s.allergies.length === 0 ? (
                            <span className="text-xs text-muted-foreground italic">Sem restrições</span>
                          ) : (
                            s.allergies.slice(0, 3).map(a => (
                              <span key={a.id} className="bg-muted px-2 py-0.5 rounded-sm text-xs font-medium">
                                {a.name}
                              </span>
                            ))
                          )}
                          {s.allergies.length > 3 && (
                            <span className="text-xs text-muted-foreground">+{s.allergies.length - 3}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {maxSeverity ? <SeverityBadge level={maxSeverity} /> : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right whitespace-nowrap">
                        <Link
                          to="/alunos/$id"
                          params={{ id: s.id }}
                          className="text-xs underline font-bold mr-4 hover:text-muted-foreground"
                        >
                          Prontuário
                        </Link>
                        <button
                          onClick={() => handleDelete(s.id, s.full_name)}
                          className="text-muted-foreground hover:text-destructive"
                          title="Excluir"
                        >
                          <Trash2 className="size-4 inline" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
