import { useMemo, useState } from "react";
import api, { getErrorMessage } from "../api";
import ConfirmDialog from "./ConfirmDialog";
import { formatMeetingDate } from "../utils/helper";

export default function SendEmailSection({ meetingId, items, onChanged }) {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const { groups, missing, resend } = useMemo(() => {
    const openItems = items.filter((i) => i.status === "open");
    const withEmail = openItems.filter((i) => i.ownerEmail);
    const unsent = withEmail.filter((i) => !i.emailSent);

    // Nothing new to send, but some were sent before: offer "Send again"
    const resend = unsent.length === 0 && withEmail.length > 0;
    const toSend = resend ? withEmail : unsent;

    const map = new Map();
    toSend.forEach((i) => {
      const key = i.ownerEmail.toLowerCase();
      if (!map.has(key)) map.set(key, { email: key, owner: i.owner, tasks: [] });
      map.get(key).tasks.push(i);
    });

    return {
      groups: [...map.values()],
      missing: openItems.filter((i) => !i.ownerEmail),
      resend,
    };
  }, [items]);

  async function handleSend() {
    setSending(true);
    setError("");
    setResult(null);
    try {
      const { data } = await api.post(`/meetings/${meetingId}/send-emails`, { resend });
      setResult(data);
      setOpen(false);
      await onChanged();
    } catch (err) {
      setError(getErrorMessage(err));
      setOpen(false);
    } finally {
      setSending(false);
    }
  }

  const canSend = groups.length > 0;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-800">Send by email</h2>
      <p className="mt-1 text-sm text-slate-600">
        Each person gets one email listing their open tasks. Tasks without an owner email are skipped.
      </p>

      {error && (
        <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-3 space-y-2 text-sm">
          {result.sent.length > 0 && (
            <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-green-800">
              <p className="font-medium">
                Sent to {result.sent.length} {result.sent.length === 1 ? "person" : "people"}
              </p>
              <ul className="mt-1 list-disc pl-5">
                {result.sent.map((s) => (
                  <li key={s.email}>
                    {s.owner ? `${s.owner} (${s.email})` : s.email}: {s.count}{" "}
                    {s.count === 1 ? "task" : "tasks"}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {result.failed.length > 0 && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-red-700">
              <p className="font-medium">Could not send to:</p>
              <ul className="mt-1 list-disc pl-5">
                {result.failed.map((f) => (
                  <li key={f.email}>
                    {f.email}: {f.error}
                  </li>
                ))}
              </ul>
              <p className="mt-1 text-xs">Click the send button again to retry these.</p>
            </div>
          )}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={!canSend || sending}
          onClick={() => setOpen(true)}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {resend ? "Send again" : "Send email"}
          {canSend ? ` (${groups.length} ${groups.length === 1 ? "person" : "people"})` : ""}
        </button>
        {!canSend && (
          <span className="text-sm text-slate-500">
            Add an owner email to at least one open task to enable this.
          </span>
        )}
        {canSend && missing.length > 0 && (
          <span className="text-sm text-amber-700">
            {missing.length} open {missing.length === 1 ? "task has" : "tasks have"} no email and will be skipped.
          </span>
        )}
      </div>

      <ConfirmDialog
        open={open}
        title={resend ? "Send these emails again?" : "Send these emails?"}
        message={
          resend
            ? "These tasks were already emailed. Each person will get the email again."
            : "Each person below will receive one email."
        }
        confirmText="Send"
        busy={sending}
        onConfirm={handleSend}
        onCancel={() => setOpen(false)}
      >
        <ul className="mt-4 space-y-3 text-sm">
          {groups.map((g) => (
            <li key={g.email} className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <p className="font-medium text-slate-800">
                {g.owner || "Unnamed"} <span className="font-normal text-slate-500">· {g.email}</span>
              </p>
              <ul className="mt-1 list-disc pl-5 text-slate-600">
                {g.tasks.map((t) => (
                  <li key={t._id}>
                    {t.task}
                    {t.deadline ? ` (due ${formatMeetingDate(t.deadline)})` : ""}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
        {missing.length > 0 && (
          <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            <p className="font-medium">Will be skipped (no email):</p>
            <ul className="mt-1 list-disc pl-5">
              {missing.map((t) => (
                <li key={t._id}>{t.task}</li>
              ))}
            </ul>
          </div>
        )}
      </ConfirmDialog>
    </section>
  );
}