import { severityMeta, type Severity } from "@/lib/severity";

export function SeverityBadge({ level }: { level: Severity }) {
  const m = severityMeta[level];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-1 ${m.bg} ${m.fg} text-[10px] font-bold uppercase tracking-widest border ${m.border} rounded-sm`}
    >
      <span className={`size-1.5 rounded-full ${m.fg.replace("text-", "bg-")}`}></span>
      {m.label}
    </span>
  );
}
