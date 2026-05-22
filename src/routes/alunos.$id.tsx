import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { SeverityBadge } from "@/components/SeverityBadge";
import type { Severity } from "@/lib/severity";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, Phone, MessageCircle, Save, Pencil, X } from "lucide-react";
import {
  GRADES, CLASS_LETTERS, RELATIONSHIPS,
  composeClassName, decomposeClassName,
  phoneSchema, formatPhone,
} from "@/lib/school-constants";
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

export const Route = createFileRoute("/alunos/$id")({
  component: () => (
    <RequireAuth>
      <StudentDetail />
    </RequireAuth>
  ),
});

interface Student {
  id: string;
  full_name: string;
  birth_date: string;
  class_name: string;
  shift: "matutino" | "vespertino" | "noturno" | "integral";
  notes: string | null;
}
interface Guardian { id: string; full_name: string; relationship: string; phone: string | null; whatsapp: string | null }
interface Allergy {
  id: string; name: string; is_custom: boolean; severity: Severity;
  symptoms: string | null; emergency_action: string | null;
}

const PREDEF = ["Lactose", "Glúten / Trigo", "Amendoim", "Nozes / Castanhas", "Ovo", "Frutos do Mar", "Soja", "Corantes Artificiais"];

const allergySchema = z.object({
  name: z.string().trim().min(1, "Nome obrigatório").max(80),
  severity: z.enum(["leve", "moderado", "grave"]),
  symptoms: z.string().trim().max(500).optional(),
  emergency_action: z.string().trim().max(500).optional(),
});

const guardianSchema = z.object({
  full_name: z.string().trim().min(1, "Nome obrigatório").max(120),
  relationship: z.string().trim().min(1, "Parentesco obrigatório").max(50),
  phone: phoneSchema.optional().or(z.literal("")),
  whatsapp: phoneSchema.optional().or(z.literal("")),
});

interface GuardianForm { full_name: string; relationship: string; phone: string; whatsapp: string }

function StudentDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState<Student | null>(null);
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [allergies, setAllergies] = useState<Allergy[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Student>>({});
  const [editGrade, setEditGrade] = useState("");
  const [editLetter, setEditLetter] = useState("");
  const [showAllergyForm, setShowAllergyForm] = useState(false);
  const [newAllergy, setNewAllergy] = useState({
    name: "", custom: "", severity: "leve" as Severity,
    symptoms: "", emergency_action: "",
  });
  const [editingAllergyId, setEditingAllergyId] = useState<string | null>(null);
  const [editAllergyForm, setEditAllergyForm] = useState<{ name: string; severity: Severity; symptoms: string; emergency_action: string }>({
    name: "", severity: "leve", symptoms: "", emergency_action: "",
  });
  const [allergyToDelete, setAllergyToDelete] = useState<string | null>(null);
  const [confirmStudentDelete, setConfirmStudentDelete] = useState(false);

  // Responsáveis - estado de edição
  const [editingGuardianId, setEditingGuardianId] = useState<string | null>(null);
  const [guardianForm, setGuardianForm] = useState<GuardianForm>({ full_name: "", relationship: "", phone: "", whatsapp: "" });
  const [showNewGuardian, setShowNewGuardian] = useState(false);
  const [guardianToDelete, setGuardianToDelete] = useState<string | null>(null);

  function startEditAllergy(a: Allergy) {
    setEditingAllergyId(a.id);
    setEditAllergyForm({
      name: a.name,
      severity: a.severity,
      symptoms: a.symptoms ?? "",
      emergency_action: a.emergency_action ?? "",
    });
  }

  async function saveEditAllergy(allergyId: string) {
    const parsed = allergySchema.safeParse(editAllergyForm);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    const { error } = await supabase.from("allergies").update({
      name: parsed.data.name,
      severity: parsed.data.severity,
      symptoms: parsed.data.symptoms || null,
      emergency_action: parsed.data.emergency_action || null,
    }).eq("id", allergyId);
    if (error) toast.error(error.message);
    else {
      toast.success("Restrição atualizada");
      setEditingAllergyId(null);
      load();
    }
  }

  async function load() {
    setLoading(true);
    const [s, g, a] = await Promise.all([
      supabase.from("students").select("*").eq("id", id).maybeSingle(),
      supabase.from("guardians").select("*").eq("student_id", id),
      supabase.from("allergies").select("*").eq("student_id", id).order("severity", { ascending: false }),
    ]);
    if (s.data) {
      setStudent(s.data as Student);
      setEditForm(s.data as Student);
      const dec = decomposeClassName((s.data as Student).class_name);
      setEditGrade(dec.grade);
      setEditLetter(dec.letter);
    }
    setGuardians((g.data ?? []) as Guardian[]);
    setAllergies((a.data ?? []) as Allergy[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, [id]);

  async function saveEdit() {
    const class_name = editGrade && editLetter ? composeClassName(editGrade, editLetter) : (editForm.class_name ?? "");
    if (!editForm.full_name || !class_name) {
      toast.error("Nome e turma obrigatórios");
      return;
    }
    const { error } = await supabase.from("students").update({
      full_name: editForm.full_name,
      birth_date: editForm.birth_date,
      class_name,
      shift: editForm.shift,
      notes: editForm.notes,
    }).eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Dados atualizados");
      setEditing(false);
      load();
    }
  }

  function startEditGuardian(g: Guardian) {
    setEditingGuardianId(g.id);
    setShowNewGuardian(false);
    setGuardianForm({
      full_name: g.full_name,
      relationship: g.relationship,
      phone: g.phone ?? "",
      whatsapp: g.whatsapp ?? "",
    });
  }

  async function saveGuardian() {
    const parsed = guardianSchema.safeParse(guardianForm);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    const payload = {
      full_name: parsed.data.full_name,
      relationship: parsed.data.relationship,
      phone: parsed.data.phone || null,
      whatsapp: parsed.data.whatsapp || null,
    };
    if (editingGuardianId) {
      const { error } = await supabase.from("guardians").update(payload).eq("id", editingGuardianId);
      if (error) return toast.error(error.message);
      toast.success("Responsável atualizado");
    } else {
      const { error } = await supabase.from("guardians").insert({ ...payload, student_id: id });
      if (error) return toast.error(error.message);
      toast.success("Responsável adicionado");
    }
    setEditingGuardianId(null);
    setShowNewGuardian(false);
    setGuardianForm({ full_name: "", relationship: "", phone: "", whatsapp: "" });
    load();
  }

  async function deleteGuardian(gid: string) {
    const { error } = await supabase.from("guardians").delete().eq("id", gid);
    if (error) toast.error(error.message);
    else { toast.success("Responsável removido"); load(); }
  }

  async function addAllergy() {
    const name = newAllergy.name === "__custom__" ? newAllergy.custom : newAllergy.name;
    const parsed = allergySchema.safeParse({
      name,
      severity: newAllergy.severity,
      symptoms: newAllergy.symptoms,
      emergency_action: newAllergy.emergency_action,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    const { error } = await supabase.from("allergies").insert({
      student_id: id,
      name: parsed.data.name,
      is_custom: newAllergy.name === "__custom__",
      severity: parsed.data.severity,
      symptoms: parsed.data.symptoms || null,
      emergency_action: parsed.data.emergency_action || null,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Restrição adicionada");
      setShowAllergyForm(false);
      setNewAllergy({ name: "", custom: "", severity: "leve", symptoms: "", emergency_action: "" });
      load();
    }
  }

  async function deleteAllergy(allergyId: string) {
    const { error } = await supabase.from("allergies").delete().eq("id", allergyId);
    if (error) toast.error(error.message);
    else { toast.success("Removida"); load(); }
  }

  async function deleteStudent() {
    const { error } = await supabase.from("students").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Aluno excluído");
      navigate({ to: "/alunos" });
    }
  }

  if (loading) {
    return <AppShell title="Carregando..."><div className="medical-label">Buscando registro...</div></AppShell>;
  }
  if (!student) {
    return (
      <AppShell title="Aluno não encontrado">
        <Link to="/alunos" className="text-xs underline font-bold uppercase tracking-widest">← Voltar à lista</Link>
      </AppShell>
    );
  }

  return (
    <AppShell
      title={`Prontuário · ${student.full_name}`}
      subtitle={`ID: ${student.id.slice(0, 8).toUpperCase()} · ${student.class_name} · ${student.shift}`}
      actions={
        <>
          <Link to="/alunos" className="px-4 py-2 text-xs font-bold uppercase tracking-widest border border-border hover:bg-muted flex items-center gap-2">
            <ArrowLeft className="size-3" /> Voltar
          </Link>
          <button
            onClick={() => setConfirmStudentDelete(true)}
            className="px-4 py-2 text-xs font-bold uppercase tracking-widest border border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground flex items-center gap-2"
          >
            <Trash2 className="size-3" /> Excluir
          </button>
        </>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-7xl">
        <div className="lg:col-span-2 space-y-6">
          {/* Identificação */}
          <section className="bg-card clinical-border p-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <div className="medical-label">Identificação</div>
                <h2 className="font-bold text-lg">Dados do Aluno</h2>
              </div>
              {!editing ? (
                <button onClick={() => setEditing(true)} className="text-xs font-bold uppercase tracking-widest underline">Editar</button>
              ) : (
                <div className="flex gap-2">
                  <button onClick={() => { setEditing(false); setEditForm(student); }} className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Cancelar</button>
                  <button onClick={saveEdit} className="text-xs font-bold uppercase tracking-widest bg-foreground text-background px-3 py-1 flex items-center gap-1">
                    <Save className="size-3" /> Salvar
                  </button>
                </div>
              )}
            </div>
            {editing ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Nome">
                  <input className="form-input" value={editForm.full_name ?? ""} onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} />
                </Field>
                <Field label="Nascimento">
                  <input type="date" className="form-input" value={editForm.birth_date ?? ""} onChange={(e) => setEditForm({ ...editForm, birth_date: e.target.value })} />
                </Field>
                <Field label="Turma">
                  <input className="form-input" value={editForm.class_name ?? ""} onChange={(e) => setEditForm({ ...editForm, class_name: e.target.value })} />
                </Field>
                <Field label="Turno">
                  <select className="form-input" value={editForm.shift} onChange={(e) => setEditForm({ ...editForm, shift: e.target.value as Student["shift"] })}>
                    <option value="matutino">Matutino</option>
                    <option value="vespertino">Vespertino</option>
                    <option value="noturno">Noturno</option>
                    <option value="integral">Integral</option>
                  </select>
                </Field>
                <div className="col-span-2">
                  <Field label="Observações">
                    <textarea className="form-input" rows={3} value={editForm.notes ?? ""} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} />
                  </Field>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <Info label="Nome Completo" value={student.full_name} />
                <Info label="Data de Nascimento" value={new Date(student.birth_date).toLocaleDateString("pt-BR")} />
                <Info label="Turma / Série" value={student.class_name} />
                <Info label="Turno" value={student.shift} className="capitalize" />
                {student.notes && <Info className="col-span-2" label="Observações" value={student.notes} />}
              </div>
            )}
          </section>

          {/* Restrições */}
          <section className="bg-card clinical-border p-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <div className="medical-label">Controle Alimentar</div>
                <h2 className="font-bold text-lg">Restrições Registradas ({allergies.length})</h2>
              </div>
              <button
                onClick={() => setShowAllergyForm(!showAllergyForm)}
                className="text-xs font-bold uppercase tracking-widest border border-foreground px-3 py-1.5 hover:bg-foreground hover:text-background flex items-center gap-1"
              >
                <Plus className="size-3" /> {showAllergyForm ? "Cancelar" : "Adicionar"}
              </button>
            </div>

            {showAllergyForm && (
              <div className="border border-border p-4 mb-4 space-y-3 bg-muted/20">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Tipo de Alergia *">
                    <select
                      className="form-input"
                      value={newAllergy.name}
                      onChange={(e) => setNewAllergy({ ...newAllergy, name: e.target.value })}
                    >
                      <option value="">Selecionar...</option>
                      {PREDEF.map(p => <option key={p} value={p}>{p}</option>)}
                      <option value="__custom__">Outra (personalizada)</option>
                    </select>
                  </Field>
                  <Field label="Gravidade *">
                    <select
                      className="form-input"
                      value={newAllergy.severity}
                      onChange={(e) => setNewAllergy({ ...newAllergy, severity: e.target.value as Severity })}
                    >
                      <option value="leve">Leve</option>
                      <option value="moderado">Moderado</option>
                      <option value="grave">Grave</option>
                    </select>
                  </Field>
                  {newAllergy.name === "__custom__" && (
                    <div className="col-span-2">
                      <Field label="Nome Personalizado *">
                        <input
                          className="form-input"
                          value={newAllergy.custom}
                          onChange={(e) => setNewAllergy({ ...newAllergy, custom: e.target.value })}
                          maxLength={80}
                        />
                      </Field>
                    </div>
                  )}
                  <div className="col-span-2">
                    <Field label="Sintomas">
                      <textarea
                        className="form-input"
                        rows={2}
                        value={newAllergy.symptoms}
                        onChange={(e) => setNewAllergy({ ...newAllergy, symptoms: e.target.value })}
                        placeholder="Ex: urticária, dificuldade respiratória..."
                        maxLength={500}
                      />
                    </Field>
                  </div>
                  <div className="col-span-2">
                    <Field label="Ação de Emergência">
                      <textarea
                        className="form-input"
                        rows={2}
                        value={newAllergy.emergency_action}
                        onChange={(e) => setNewAllergy({ ...newAllergy, emergency_action: e.target.value })}
                        placeholder="Ex: aplicar epinefrina, contatar SAMU..."
                        maxLength={500}
                      />
                    </Field>
                  </div>
                </div>
                <button onClick={addAllergy} className="bg-foreground text-background px-4 py-2 text-xs font-bold uppercase tracking-widest">
                  Salvar Restrição
                </button>
              </div>
            )}

            {allergies.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground italic">Nenhuma restrição cadastrada.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {allergies.map(a => (
                  <div key={a.id} className="border border-border p-4">
                    {editingAllergyId === a.id ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <Field label="Nome *">
                            <input
                              className="form-input"
                              value={editAllergyForm.name}
                              onChange={(e) => setEditAllergyForm({ ...editAllergyForm, name: e.target.value })}
                              maxLength={80}
                            />
                          </Field>
                          <Field label="Gravidade *">
                            <select
                              className="form-input"
                              value={editAllergyForm.severity}
                              onChange={(e) => setEditAllergyForm({ ...editAllergyForm, severity: e.target.value as Severity })}
                            >
                              <option value="leve">Leve</option>
                              <option value="moderado">Moderado</option>
                              <option value="grave">Grave</option>
                            </select>
                          </Field>
                          <div className="col-span-2">
                            <Field label="Sintomas">
                              <textarea
                                className="form-input"
                                rows={2}
                                value={editAllergyForm.symptoms}
                                onChange={(e) => setEditAllergyForm({ ...editAllergyForm, symptoms: e.target.value })}
                                maxLength={500}
                              />
                            </Field>
                          </div>
                          <div className="col-span-2">
                            <Field label="Ação de Emergência">
                              <textarea
                                className="form-input"
                                rows={2}
                                value={editAllergyForm.emergency_action}
                                onChange={(e) => setEditAllergyForm({ ...editAllergyForm, emergency_action: e.target.value })}
                                maxLength={500}
                              />
                            </Field>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => saveEditAllergy(a.id)} className="bg-foreground text-background px-3 py-1.5 text-xs font-bold uppercase tracking-widest flex items-center gap-1">
                            <Save className="size-3" /> Salvar
                          </button>
                          <button onClick={() => setEditingAllergyId(null)} className="border border-border px-3 py-1.5 text-xs font-bold uppercase tracking-widest flex items-center gap-1">
                            <X className="size-3" /> Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="font-bold flex items-center gap-2">
                              {a.name}
                              {a.is_custom && <span className="text-[9px] medical-label opacity-50">PERSONALIZADA</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <SeverityBadge level={a.severity} />
                            <button onClick={() => startEditAllergy(a)} className="text-muted-foreground hover:text-foreground" title="Editar">
                              <Pencil className="size-4" />
                            </button>
                            <button onClick={() => setAllergyToDelete(a.id)} className="text-muted-foreground hover:text-destructive" title="Excluir">
                              <Trash2 className="size-4" />
                            </button>
                          </div>
                        </div>
                        {a.symptoms && (
                          <div className="text-sm mt-2">
                            <span className="medical-label">Sintomas: </span>
                            <span className="text-muted-foreground">{a.symptoms}</span>
                          </div>
                        )}
                        {a.emergency_action && (
                          <div className="text-sm mt-1">
                            <span className="medical-label text-destructive">Ação Emergência: </span>
                            <span>{a.emergency_action}</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <section className="bg-card clinical-border p-6">
            <div className="medical-label mb-1">Contatos</div>
            <h2 className="font-bold text-lg mb-4">Responsáveis ({guardians.length})</h2>
            {guardians.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">Nenhum responsável cadastrado.</p>
            ) : (
              <div className="space-y-4">
                {guardians.map(g => (
                  <div key={g.id} className="border-l-2 border-foreground pl-3">
                    <div className="font-bold">{g.full_name}</div>
                    <div className="text-xs medical-label opacity-70 mb-2">{g.relationship}</div>
                    {g.phone && (
                      <a href={`tel:${g.phone}`} className="flex items-center gap-2 text-sm hover:underline">
                        <Phone className="size-3" /> {g.phone}
                      </a>
                    )}
                    {g.whatsapp && (
                      <a href={`https://wa.me/${g.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm hover:underline">
                        <MessageCircle className="size-3" /> {g.whatsapp}
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </aside>
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
        }
      `}</style>

      <AlertDialog open={!!allergyToDelete} onOpenChange={(o) => !o && setAllergyToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover restrição</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover esta restrição alimentar? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (allergyToDelete) deleteAllergy(allergyToDelete);
                setAllergyToDelete(null);
              }}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmStudentDelete} onOpenChange={setConfirmStudentDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir aluno</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{student.full_name}</strong> permanentemente? Todas as restrições e responsáveis também serão removidos. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                setConfirmStudentDelete(false);
                deleteStudent();
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}

function Info({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={className}>
      <div className="medical-label mb-1">{label}</div>
      <div className={`font-medium ${className ?? ""}`}>{value}</div>
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="medical-label block mb-2">{label}</label>
      {children}
    </div>
  );
}
