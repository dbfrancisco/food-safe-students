export type Severity = "leve" | "moderado" | "grave";

export const severityMeta: Record<Severity, { label: string; bg: string; fg: string; border: string }> = {
  leve: {
    label: "LEVE",
    bg: "bg-severity-mild-bg",
    fg: "text-severity-mild",
    border: "border-severity-mild/30",
  },
  moderado: {
    label: "MODERADO",
    bg: "bg-severity-moderate-bg",
    fg: "text-severity-moderate",
    border: "border-severity-moderate/30",
  },
  grave: {
    label: "GRAVE",
    bg: "bg-severity-severe-bg",
    fg: "text-severity-severe",
    border: "border-severity-severe/30",
  },
};
