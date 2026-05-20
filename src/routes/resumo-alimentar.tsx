import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { Download, Users, Utensils } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";

export const Route = createFileRoute("/resumo-alimentar")({
  component: () => (
    <RequireAuth>
      <ResumoAlimentar />
    </RequireAuth>
  ),
});

interface StudentRow {
  id: string;
  full_name: string;
  class_name: string;
  shift: string;
  allergies: { name: string }[];
}

const SHIFT_LABEL: Record<string, string> = {
  matutino: "Manhã",
  vespertino: "Tarde",
  noturno: "Noite",
  integral: "Integral",
};

function ResumoAlimentar() {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [shift, setShift] = useState<string>("");
  const [className, setClassName] = useState<string>("");

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("students")
        .select("id, full_name, class_name, shift, allergies(name)")
        .order("class_name");
      if (error) toast.error(error.message);
      setStudents((data ?? []) as StudentRow[]);
      setLoading(false);
    })();
  }, []);

  const classes = useMemo(
    () => Array.from(new Set(students.map((s) => s.class_name))).sort(),
    [students]
  );

  const filtered = useMemo(() => {
    return students.filter((s) => {
      if (shift && s.shift !== shift) return false;
      if (className && s.class_name !== className) return false;
      return true;
    });
  }, [students, shift, className]);

  const withRestriction = filtered.filter((s) => s.allergies.length > 0);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    withRestriction.forEach((s) =>
      s.allergies.forEach((a) => map.set(a.name, (map.get(a.name) ?? 0) + 1))
    );
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [withRestriction]);

  const shiftLabel = shift ? SHIFT_LABEL[shift] ?? shift : "Todos";
  const classLabel = className || "Todas";

  function generatePDF() {
    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
      const now = new Date().toLocaleString("pt-BR");
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("DIETASAFE — Resumo Alimentar Escolar", 40, 50);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(`Emitido em: ${now}`, 40, 68);
      doc.text(`Turno: ${shiftLabel}`, 40, 84);
      doc.text(`Turma: ${classLabel}`, 200, 84);
      doc.text(`Total de alunos com restrição: ${withRestriction.length}`, 40, 100);

      autoTable(doc, {
        startY: 120,
        head: [["Restrição Alimentar", "Quantidade"]],
        body: counts.length ? counts.map(([n, q]) => [n, String(q)]) : [["—", "0"]],
        styles: { fontSize: 10, cellPadding: 6 },
        headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: "bold" },
      });

      doc.save(`dietasafe-resumo-${new Date().toISOString().slice(0, 10)}.pdf`);
      toast.success("Resumo PDF gerado");
    } catch (err) {
      toast.error("Erro ao gerar PDF: " + (err instanceof Error ? err.message : ""));
    }
  }

  return (
    <AppShell
      title="Resumo Alimentar Escolar"
      subtitle="Planejamento de refeições · apoio à cozinha e nutricionista"
      actions={
        <button
          onClick={generatePDF}
          className="px-4 py-2 text-xs font-bold uppercase tracking-widest bg-foreground text-background hover:bg-foreground/90 flex items-center gap-2"
        >
          <Download className="size-3" /> Gerar Resumo PDF
        </button>
      }
    >
      <div className="space-y-6">
        <div className="bg-muted/40 p-4 clinical-border flex flex-wrap gap-4">
          <div className="w-48">
            <label className="medical-label block mb-2">Turno</label>
            <select
              value={shift}
              onChange={(e) => setShift(e.target.value)}
              className="w-full bg-card border border-border px-3 py-2 text-sm focus:outline-none"
            >
              <option value="">Todos</option>
              <option value="matutino">Manhã</option>
              <option value="vespertino">Tarde</option>
              <option value="noturno">Noite</option>
              <option value="integral">Integral</option>
            </select>
          </div>
          <div className="w-60">
            <label className="medical-label block mb-2">Turma</label>
            <select
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              className="w-full bg-card border border-border px-3 py-2 text-sm focus:outline-none"
            >
              <option value="">Todas</option>
              {classes.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="bg-card clinical-border px-6 py-12 text-center medical-label">
            Carregando dados...
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-card clinical-border p-5">
                <div className="flex items-center gap-2 medical-label">
                  <Users className="size-3" /> Alunos no filtro
                </div>
                <div className="text-3xl font-bold mt-2">{filtered.length}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Turno: {shiftLabel} · Turma: {classLabel}
                </div>
              </div>
              <div className="bg-card clinical-border p-5">
                <div className="flex items-center gap-2 medical-label">
                  <Utensils className="size-3" /> Com restrição
                </div>
                <div className="text-3xl font-bold mt-2">{withRestriction.length}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Requerem refeição específica
                </div>
              </div>
              <div className="bg-card clinical-border p-5">
                <div className="medical-label">Tipos de restrição</div>
                <div className="text-3xl font-bold mt-2">{counts.length}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Categorias distintas identificadas
                </div>
              </div>
            </div>

            <div className="bg-card clinical-border p-6">
              <div className="medical-label mb-1">Distribuição por Restrição</div>
              <h2 className="font-bold text-lg mb-4">Quantidade por tipo</h2>
              {counts.length === 0 ? (
                <p className="text-sm text-muted-foreground italic py-6 text-center">
                  Nenhuma restrição alimentar registrada para este filtro.
                </p>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {counts.map(([name, qty]) => (
                    <div
                      key={name}
                      className="border border-border bg-muted/30 px-4 py-3 min-w-[140px]"
                    >
                      <div className="medical-label">{name}</div>
                      <div className="text-2xl font-bold mt-1">{qty}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {qty === 1 ? "aluno" : "alunos"}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
