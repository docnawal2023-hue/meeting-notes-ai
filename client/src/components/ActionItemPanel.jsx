import { useEffect, useState } from "react";
import api, { getErrorMessage } from "../api";
import ConfirmDialog from "./ConfirmDialog";

function ItemRow({ item, onChanged, onDelete, onError }) {
  const [task, setTask] = useState(item.task);
  const [owner, setOwner] = useState(item.owner || "");
  const [email, setEmail] = useState(item.ownerEmail || "");
  const [deadline, setDeadline] = useState(item.deadline ? item.deadline.slice(0, 10) : "");
  const [saving, setSaving] = useState(false);

  // When fresh data arrives from the server, refresh the boxes
  useEffect(() => {
    setTask(item.task);
    setOwner(item.owner || "");
    setEmail(item.ownerEmail || "");
    setDeadline(item.deadline ? item.deadline.slice(0, 10) : "");
  }, [item.updatedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  async function save(patch) {
    setSaving(true);
    onError("");
    try {
      await api.patch(`/action-items/${item._id}`, patch);
      await onChanged();
    } catch (err) {
      onError(getErrorMessage(err));
      // put the old values back
      setTask(item.task);
      setOwner(item.owner || "");
      setEmail(item.ownerEmail || "");
      setDeadline(item.deadline ? item.deadline.slice(0, 10) : "");
    } finally {
      setSaving(false);
    }
  }

  const done = item.status === "done";
  const box =
    "w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <li className={`rounded-lg border p-3 ${done ? "border-green-200 bg-green-50" : "border-slate-200 bg-white"}`}>
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={done}
          disabled={saving}
          onChange={(e) => save({ status: e.target.checked ? "done" : "open" })}
          className="mt-2 h-4 w-4 shrink-0"
          title="Mark as done"
        />
        <div className="min-w-0 flex-1 space-y-2">
          <input
            value={task}
            onChange={(e) => setTask(e.target.value)}
            onBlur={() => task.trim() !== item.task && save({ task })}
            maxLength={500}
            className={`${box} font-medium ${done ? "line-through text-slate-500" : ""}`}
          />
          <div className="grid gap-2 sm:grid-cols-3">
            <input
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              onBlur={() => owner.trim() !== (item.owner || "") && save({ owner })}
              placeholder="Owner"
              maxLength={100}
              className={box}
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() =>
                email.trim() !== (item.ownerEmail || "") &&
                save({ ownerEmail: email.trim(), applyToSameOwner: true })
              }
              placeholder="Owner email"
              className={box}
            />
            <input
              type="date"
              value={deadline}
              onChange={(e) => {
                setDeadline(e.target.value);
                if (e.target.value !== (item.deadline ? item.deadline.slice(0, 10) : "")) {
                  save({ deadline: e.target.value });
                }
              }}
              className={box}
            />
          </div>
          {item.emailSent && <p className="text-xs text-green-700">✓ Emailed</p>}
        </div>
        <button
          type="button"
          onClick={() => onDelete(item)}
          className="shrink-0 rounded-md px-2 py-1 text-sm text-red-600 hover:bg-red-50"
          title="Delete task"
        >
          ✕
        </button>
      </div>
    </li>
  );
}

export default function ActionItemsPanel({ meetingId, items, onChanged }) {
  const [error, setError] = useState("");
  const [newTask, setNewTask] = useState("");
  const [adding, setAdding] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const open = items.filter((i) => i.status === "open").length;

  async function addTask(e) {
    e.preventDefault();
    if (!newTask.trim() || adding) return;
    setAdding(true);
    setError("");
    try {
      await api.post(`/meetings/${meetingId}/action-items`, { task: newTask });
      setNewTask("");
      await onChanged();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setAdding(false);
    }
  }

  async function confirmDelete() {
    setDeleting(true);
    try {
      await api.delete(`/action-items/${toDelete._id}`);
      setToDelete(null);
      await onChanged();
    } catch (err) {
      setError(getErrorMessage(err));
      setToDelete(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-lg font-semibold text-slate-800">Action items</h2>
        <span className="text-sm text-slate-500">
          {open} open · {items.length - open} done
        </span>
      </div>

      {error && (
        <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {items.length === 0 ? (
        <p className="mb-3 text-sm text-slate-500">
          No action items were found in this meeting. You can add one below.
        </p>
      ) : (
        <ul className="mb-4 space-y-3">
          {items.map((it) => (
            <ItemRow
              key={it._id}
              item={it}
              onChanged={onChanged}
              onDelete={setToDelete}
              onError={setError}
            />
          ))}
        </ul>
      )}

      <form onSubmit={addTask} className="flex gap-2">
        <input
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          placeholder="Add a task…"
          maxLength={500}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={adding || !newTask.trim()}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          Add
        </button>
      </form>

      <p className="mt-3 text-xs text-slate-500">
        Changes save automatically when you click out of a box. Typing an email for one person fills it in for all of that person’s tasks.
      </p>

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Delete this task?"
        message={toDelete ? `“${toDelete.task}” will be removed.` : ""}
        confirmText="Delete"
        danger
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </section>
  );
}