import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import {
  GRADES, CLASS_LETTERS, RELATIONSHIPS,
  composeClassName, phoneSchema, formatPhone,
} from "@/lib/school-constants";

export const Route = createFileRoute("/alunos/novo")({
  component: () => (
    <RequireAuth>
      <NewStudent />
    </RequireAuth>
  ),
});

const guardianSchema = z.object({
  full_name: z.string().trim().min(1, "Nome do responsável obrigatório").max(120),
  relationship: z.string().trim().min(1, "Parentesco obrigatório").max(50),
  phone: phoneSchema.optional().or(z.literal("")),
  whatsapp: phoneSchema.optional().or(z.literal("")),
});

const studentSchema = z.object({
  full_name: z.string().trim().min(1, "Nome obrigatório").max(120),
  birth_date: z.string().min(1, "Data obrigatória"),
  class_name: z.string().trim().min(1, "Turma obrigatória").max(50),
  shift: z.enum(["matutino", "vespertino", "noturno", "integral"]),
  notes: z.string().trim().max(1000).optional(),
});

interface GuardianForm { full_name: string; relationship: string; phone: string; whatsapp: string }

function NewStudent() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [grade, setGrade] = useState("");
  const [letter, setLetter] = useState("");
  const [form, setForm] = useState({
    full_name: "",
    birth_date: "",
    shift: "matutino" as "matutino" | "vespertino" | "noturno" | "integral",
    notes: "",
  });
  const [guardians, setGuardians] = useState<GuardianForm[]>([
    { full_name: "", relationship: "", phone: "", whatsapp: "" },
  ]);

  function updateGuardian(i: number, field: keyof GuardianForm, val: string) {
    setGuardians(g => g.map((x, idx) => idx === i ? { ...x, [field]: val } : x));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const class_name = composeClassName(grade, letter);
    const parsed = studentSchema.safeParse({ ...form, class_name });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    const validGuardians: GuardianForm[] = [];
    for (const g of guardians) {
      if (!g.full_name && !g.relationship && !g.phone && !g.whatsapp) continue;
      const gp = guardianSchema.safeParse(g);
      if (!gp.success) {
        toast.error("Responsável: " + gp.error.issues[0].message);
        return;
      }
      validGuardians.push(g);
    }

    setLoading(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      const { data: student, error } = await supabase
        .from("students")
        .insert({
          full_name: parsed.data.full_name,
          birth_date: parsed.data.birth_date,
          class_name: parsed.data.class_name,
          shift: parsed.data.shift,
          notes: parsed.data.notes || null,
          created_by: user.user?.id,
        })
        .select()
        .single();
      if (error) throw error;

      if (validGuardians.length > 0 && student) {
        const { error: gErr } = await supabase.from("guardians").insert(
          validGuardians.map(g => ({
            student_id: student.id,
            full_name: g.full_name,
            relationship: g.relationship,
            phone: g.phone || null,
            whatsapp: g.whatsapp || null,
          }))
        );
        if (gErr) throw gErr;
      }

      toast.success("Aluno cadastrado com sucesso");
      if (student) navigate({ to: "/alunos/$id", params: { id: student.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao cadastrar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell
      title="Cadastro de Aluno"
      subtitle="Preencha as informações pessoais e de responsáveis"
      actions={
        <Link to="/alunos" className="px-4 py-2 text-xs font-bold uppercase tracking-widest border border-foreground hover:bg-foreground hover:text-background flex items-center gap-2">
          <ArrowLeft className="size-3" /> Voltar
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className="max-w-4xl space-y-8">
        <section className="bg-card clinical-border p-6">
          <div className="medical-label mb-1">Seção 01</div>
          <h2 className="font-bold text-lg mb-6">Identificação do Aluno</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Nome Completo" required>
              <input
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                className="form-input"
                required maxLength={120}
              />
            </Field>
            <Field label="Data de Nascimento" required>
              <input
                type="date"
                value={form.birth_date}
                onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
                className="form-input" required
              />
            </Field>
            <Field label="Ano" required>
              <select
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                className="form-input" required
              >
                <option value="">Selecionar ano...</option>
                {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </Field>
            <Field label="Letra da Turma" required>
              <select
                value={letter}
                onChange={(e) => setLetter(e.target.value)}
                className="form-input" required
              >
                <option value="">Selecionar letra...</option>
                {CLASS_LETTERS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </Field>
            {grade && letter && (
              <div className="md:col-span-2">
                <div className="medical-label mb-1">Turma resultante</div>
                <div className="font-bold text-base">{composeClassName(grade, letter)}</div>
              </div>
            )}
            <Field label="Turno" required>
              <select
                value={form.shift}
                onChange={(e) => setForm({ ...form, shift: e.target.value as typeof form.shift })}
                className="form-input"
              >
                <option value="matutino">Matutino</option>
                <option value="vespertino">Vespertino</option>
                <option value="noturno">Noturno</option>
                <option value="integral">Integral</option>
              </select>
            </Field>
          </div>
          <Field label="Observações" className="mt-4">
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
              className="form-input"
              maxLength={1000}
            />
          </Field>
        </section>

        <section className="bg-card clinical-border p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="medical-label mb-1">Seção 02</div>
              <h2 className="font-bold text-lg">Responsáveis</h2>
            </div>
            <button
              type="button"
              onClick={() => setGuardians(g => [...g, { full_name: "", relationship: "", phone: "", whatsapp: "" }])}
              className="text-xs font-bold uppercase tracking-widest border border-border px-3 py-1.5 hover:bg-muted flex items-center gap-1"
            >
              <Plus className="size-3" /> Adicionar
            </button>
          </div>
          <div className="space-y-4">
            {guardians.map((g, i) => (
              <div key={i} className="border border-border p-4 grid grid-cols-1 md:grid-cols-2 gap-4 relative">
                <div className="absolute -top-3 left-3 bg-card px-2 medical-label">Responsável {i + 1}</div>
                {guardians.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setGuardians(gs => gs.filter((_, idx) => idx !== i))}
                    className="absolute -top-4 right-2 bg-card border border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground rounded-full p-1.5 transition-colors"
                    title="Remover responsável"
                  >
                    <Trash2 className="size-4" />
                  </button>
                )}
                <Field label="Nome">
                  <input value={g.full_name} onChange={(e) => updateGuardian(i, "full_name", e.target.value)} className="form-input" maxLength={120} />
                </Field>
                <Field label="Parentesco">
                  <select value={g.relationship} onChange={(e) => updateGuardian(i, "relationship", e.target.value)} className="form-input">
                    <option value="">Selecionar...</option>
                    {RELATIONSHIPS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </Field>
                <Field label="Telefone">
                  <input
                    value={g.phone}
                    onChange={(e) => updateGuardian(i, "phone", formatPhone(e.target.value))}
                    placeholder="(00) 0000-0000"
                    className="form-input"
                    maxLength={16}
                    inputMode="tel"
                  />
                </Field>
                <Field label="WhatsApp">
                  <input
                    value={g.whatsapp}
                    onChange={(e) => updateGuardian(i, "whatsapp", formatPhone(e.target.value))}
                    placeholder="(00) 90000-0000"
                    className="form-input"
                    maxLength={16}
                    inputMode="tel"
                  />
                </Field>
              </div>
            ))}
          </div>
        </section>

        <div className="flex justify-end gap-3">
          <Link to="/alunos" className="px-6 py-3 text-xs font-bold uppercase tracking-widest border border-border hover:bg-muted">
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 text-xs font-bold uppercase tracking-widest bg-foreground text-background hover:bg-foreground/90 disabled:opacity-50"
          >
            {loading ? "Salvando..." : "Cadastrar Aluno"}
          </button>
        </div>

        <style>{`
          .form-input {
            width: 100%;
            background: var(--color-background);
            border: 1px solid var(--color-border);
            padding: 0.5rem 0.75rem;
            font-size: 0.875rem;
            outline: none;
          }
          .form-input:focus {
            box-shadow: 0 0 0 1px var(--color-foreground);
            border-color: var(--color-foreground);
          }
        `}</style>
      </form>
    </AppShell>
  );
}

function Field({ label, required, children, className }: {
  label: string; required?: boolean; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={className}>
      <label className="medical-label block mb-2">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      {children}
    </div>
  );
}
