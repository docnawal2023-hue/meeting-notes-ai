import { useMemo, useState } from "react";
import api, { getErrorMessage } from "../api";
import { SPEAKER_COLORS, formatTimer } from "../utils/helper";

export default function TranscriptView({ meetingId, transcript, speakerNames, onRenamed }) {
  const names = speakerNames || {};

  // Unique speaker labels in the order they first talk
  const labels = useMemo(() => {
    const seen = [];
    transcript.forEach((s) => {
      if (!seen.includes(s.speaker)) seen.push(s.speaker);
    });
    return seen;
  }, [transcript]);

  const colorOf = (label) => SPEAKER_COLORS[labels.indexOf(label) % SPEAKER_COLORS.length];
  const displayName = (label) => names[label] || label;

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function startEditing() {
    const initial = {};
    labels.forEach((l) => (initial[l] = names[l] || ""));
    setDraft(initial);
    setError("");
    setEditing(true);
  }

  async function save() {
    // Send only the names that changed
    const changes = {};
    labels.forEach((l) => {
      const next = (draft[l] || "").trim();
      if (next !== (names[l] || "")) changes[l] = next;
    });

    if (Object.keys(changes).length === 0) {
      setEditing(false);
      return;
    }

    setSaving(true);
    setError("");
    try {
      await api.patch(`/meetings/${meetingId}/speakers`, { speakerNames: changes });
      setEditing(false);
      await onRenamed();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-slate-800">Transcript</h2>
        {!editing && labels.length > 0 && (
          <button
            type="button"
            onClick={startEditing}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
          >
            Rename speakers
          </button>
        )}
      </div>

      {editing && (
        <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="mb-3 text-sm text-slate-600">
            Give each speaker a real name. Task owners with the old name are updated too. Leave a box empty to go back to the label.
          </p>
          {error && (
            <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            {labels.map((l) => (
              <label key={l} className="block text-sm">
                <span className={`mb-1 flex items-center gap-2 font-medium ${colorOf(l).text}`}>
                  <span className={`h-2 w-2 rounded-full ${colorOf(l).dot}`} />
                  {l}
                </span>
                <input
                  value={draft[l] ?? ""}
                  onChange={(e) => setDraft({ ...draft, [l]: e.target.value })}
                  maxLength={50}
                  placeholder="Real name"
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </label>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save names"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              disabled={saving}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-white disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {transcript.length === 0 ? (
        <p className="text-sm text-slate-500">No transcript available.</p>
      ) : (
        <ul className="max-h-[32rem] space-y-3 overflow-y-auto pr-2">
          {transcript.map((s, i) => (
            <li key={i} className="text-sm">
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${colorOf(s.speaker).dot}`} />
                <span className={`font-semibold ${colorOf(s.speaker).text}`}>
                  {displayName(s.speaker)}
                </span>
                <span className="font-mono text-xs text-slate-400">
                  {formatTimer(Math.floor(s.start || 0))}
                </span>
              </div>
              <p className="mt-0.5 pl-4 text-slate-700">{s.text}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}