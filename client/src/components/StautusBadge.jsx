const STYLES = {
  uploaded: { label: "Queued", cls: "bg-slate-100 text-slate-700", pulse: true },
  transcribing: { label: "Transcribing", cls: "bg-blue-100 text-blue-700", pulse: true },
  analyzing: { label: "Analyzing", cls: "bg-purple-100 text-purple-700", pulse: true },
  done: { label: "Ready", cls: "bg-green-100 text-green-700", pulse: false },
  failed: { label: "Failed", cls: "bg-red-100 text-red-700", pulse: false },
};

export default function StatusBadge({ status }) {
  const s = STYLES[status] || { label: status, cls: "bg-slate-100 text-slate-700", pulse: false };
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${s.cls}`}
    >
      {s.pulse && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />}
      {s.label}
    </span>
  );
}