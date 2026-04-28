import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { SeverityBadge } from "@/components/SeverityBadge";
import type { Severity } from "@/lib/severity";
import { Printer, Download } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";

export const Route = createFileRoute("/relatorio")({
  component: () => (
    <RequireAuth>
      <ReportPage />
    </RequireAuth>
  ),
});

interface Row {
  student_id: string;
  full_name: string;
  class_name: string;
  shift: string;
  birth_date: string;
  allergies: { name: string; severity: Severity; emergency_action: string | null }[];
  guardians: { full_name: string; phone: string | null }[];
}

function ReportPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("");
  const [filterSeverity, setFilterSeverity] = useState<"" | Severity>("");

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("students")
        .select("id, full_name, class_name, shift, birth_date, allergies(name, severity, emergency_action), guardians(full_name, phone)")
        .order("class_name");
      const mapped = (data ?? []).map(s => ({
        student_id: s.id,
        full_name: s.full_name,
        class_name: s.class_name,
        shift: s.shift,
        birth_date: s.birth_date,
        allergies: s.allergies as Row["allergies"],
        guardians: s.guardians as Row["guardians"],
      })).filter(s => s.allergies.length > 0);
      setRows(mapped);
      setLoading(false);
    }
    load();
  }, []);

  const allergyTypes = Array.from(
    new Set(rows.flatMap(r => r.allergies.map(a => a.name)))
  ).sort();

  const filtered = rows.filter(r => {
    if (filterType && !r.allergies.some(a => a.name === filterType)) return false;
    if (filterSeverity && !r.allergies.some(a => a.severity === filterSeverity)) return false;
    return true;
  });

  function generatePDF() {
    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
      const now = new Date().toLocaleString("pt-BR");

      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("DIETASAFE — Relatório de Restrições Alimentares", 40, 50);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(`Emitido em: ${now}`, 40, 68);
      doc.text(`Total de alunos com restrições: ${filtered.length}`, 40, 82);
      if (filterType) doc.text(`Filtro tipo: ${filterType}`, 40, 96);
      if (filterSeverity) doc.text(`Filtro gravidade: ${filterSeverity.toUpperCase()}`, 250, 96);

      const body = filtered.flatMap(r =>
        r.allergies.map(a => [
          r.full_name,
          r.class_name,
          r.shift,
          a.name,
          a.severity.toUpperCase(),
          a.emergency_action ?? "—",
          r.guardians.map(g => `${g.full_name}${g.phone ? ` (${g.phone})` : ""}`).join("; ") || "—",
        ])
      );

      autoTable(doc, {
        startY: 110,
        head: [["Aluno", "Turma", "Turno", "Restrição", "Gravidade", "Ação de Emergência", "Responsáveis"]],
        body,
        styles: { fontSize: 8, cellPadding: 4 },
        headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: "bold" },
        columnStyles: {
          4: {
            cellWidth: 50,
            fontStyle: "bold",
          },
        },
        didParseCell: (data) => {
          if (data.section === "body" && data.column.index === 4) {
            const v = String(data.cell.raw);
            if (v === "GRAVE") data.cell.styles.textColor = [185, 28, 28];
            else if (v === "MODERADO") data.cell.styles.textColor = [217, 119, 6];
            else if (v === "LEVE") data.cell.styles.textColor = [5, 150, 105];
          }
        },
      });

      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(120);
        doc.text(`Página ${i} de ${pageCount}`, 40, doc.internal.pageSize.height - 20);
        doc.text("Documento confidencial — uso interno escolar", doc.internal.pageSize.width - 240, doc.internal.pageSize.height - 20);
      }

      doc.save(`dietasafe-relatorio-${new Date().toISOString().slice(0, 10)}.pdf`);
      toast.success("Relatório PDF gerado");
    } catch (err) {
      toast.error("Erro ao gerar PDF: " + (err instanceof Error ? err.message : ""));
    }
  }

  return (
    <AppShell
      title="Relatórios de Restrições"
      subtitle="Documento oficial para uso da cozinha e equipe pedagógica"
      actions={
        <>
          <button
            onClick={() => window.print()}
            className="px-4 py-2 text-xs font-bold uppercase tracking-widest border border-foreground hover:bg-foreground hover:text-background flex items-center gap-2"
          >
            <Printer className="size-3" /> Imprimir
          </button>
          <button
            onClick={generatePDF}
            className="px-4 py-2 text-xs font-bold uppercase tracking-widest bg-foreground text-background hover:bg-foreground/90 flex items-center gap-2"
          >
            <Download className="size-3" /> Baixar PDF
          </button>
        </>
      }
    >
      <div className="bg-muted/40 p-4 clinical-border flex flex-wrap gap-4 mb-6 no-print">
        <div className="w-60">
          <label className="medical-label block mb-2">Filtrar por Restrição</label>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="w-full bg-card border border-border px-3 py-2 text-sm">
            <option value="">Todas</option>
            {allergyTypes.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div className="w-48">
          <label className="medical-label block mb-2">Gravidade</label>
          <select value={filterSeverity} onChange={(e) => setFilterSeverity(e.target.value as "" | Severity)} className="w-full bg-card border border-border px-3 py-2 text-sm">
            <option value="">Todas</option>
            <option value="grave">Grave</option>
            <option value="moderado">Moderado</option>
            <option value="leve">Leve</option>
          </select>
        </div>
      </div>

      <div className="bg-card clinical-border p-8 print:p-0 print:border-0">
        <div className="border-b border-border pb-4 mb-6">
          <div className="flex justify-between items-end">
            <div>
              <div className="medical-label">DietaSafe v1.0 — Documento Oficial</div>
              <h2 className="text-2xl font-bold mt-1">Relatório de Restrições Alimentares</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {filtered.length} aluno(s) listado(s) · Emitido em {new Date().toLocaleString("pt-BR")}
              </p>
            </div>
            <div className="text-right text-xs data-mono text-muted-foreground">
              REL-{new Date().toISOString().slice(0, 10).replace(/-/g, "")}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 medical-label">Carregando dados...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="medical-label mb-2">Nenhum registro</p>
            <p className="text-sm text-muted-foreground">
              Cadastre alunos com restrições para gerar relatórios.
            </p>
          </div>
        ) : (
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b-2 border-foreground">
                <th className="px-2 py-2 medical-label">Aluno</th>
                <th className="px-2 py-2 medical-label">Turma · Turno</th>
                <th className="px-2 py-2 medical-label">Restrições</th>
                <th className="px-2 py-2 medical-label">Ação Emergência</th>
                <th className="px-2 py-2 medical-label">Contato</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => {
                const filtAllergies = r.allergies.filter(a =>
                  (!filterType || a.name === filterType) &&
                  (!filterSeverity || a.severity === filterSeverity)
                );
                return (
                  <tr key={r.student_id} className="border-b border-border align-top">
                    <td className="px-2 py-3 font-bold">{r.full_name}</td>
                    <td className="px-2 py-3">
                      <div>{r.class_name}</div>
                      <div className="text-xs capitalize text-muted-foreground">{r.shift}</div>
                    </td>
                    <td className="px-2 py-3">
                      <div className="space-y-1">
                        {filtAllergies.map((a, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <span className="font-medium">{a.name}</span>
                            <SeverityBadge level={a.severity} />
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-2 py-3 text-xs">
                      {filtAllergies.map((a, i) => (
                        <div key={i}>{a.emergency_action ?? "—"}</div>
                      ))}
                    </td>
                    <td className="px-2 py-3 text-xs">
                      {r.guardians.length === 0 ? "—" : r.guardians.map((g, i) => (
                        <div key={i}>
                          <div className="font-medium">{g.full_name}</div>
                          {g.phone && <div className="data-mono text-muted-foreground">{g.phone}</div>}
                        </div>
                      ))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        <div className="mt-6 pt-4 border-t border-border text-[10px] text-muted-foreground italic flex justify-between">
          <span>Documento confidencial — uso interno escolar</span>
          <span>DietaSafe v1.0</span>
        </div>
      </div>
    </AppShell>
  );
}
