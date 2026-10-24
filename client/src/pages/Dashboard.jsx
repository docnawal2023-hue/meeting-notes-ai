import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import api, { getErrorMessage } from "../api";
import Spinner from "../components/Spinner";
import StatusBadge from "../components/StautusBadge";
import ConfirmDialog from "../components/ConfirmDialog";
import useDebounce from "../hooks/useDebounce";
import { formatDuration, formatMeetingDate } from "../utils/helper";

const PAGE_SIZE = 10;
const ACTIVE = ["uploaded", "transcribing", "analyzing"];
const POLL_MS = 5000;

const FILTERS = [
  { value: "", label: "All statuses" },
  { value: "done", label: "Ready" },
  { value: "failed", label: "Failed" },
  { value: "transcribing", label: "Transcribing" },
  { value: "analyzing", label: "Analyzing" },
  { value: "uploaded", label: "Queued" },
];

function MeetingRow({ m, busy, onRetry, onDelete }) {
  const processing = ACTIVE.includes(m.status);

  return (
    <li className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            to={`/meetings/${m._id}`}
            className="break-words font-semibold text-slate-800 hover:text-blue-700"
          >
            {m.title}
          </Link>
          <p className="mt-0.5 text-xs text-slate-500">
            {formatMeetingDate(m.date)}
            {m.duration ? ` · ${formatDuration(m.duration)}` : ""}
          </p>
        </div>
        <StatusBadge status={m.status} />
      </div>

      {m.snippet && (
        <p className="mt-3 rounded-md bg-yellow-50 px-3 py-2 text-sm text-slate-700">
          {m.snippet}
        </p>
      )}

      {!m.snippet && m.status === "done" && m.summary && (
        <p className="mt-3 line-clamp-2 text-sm text-slate-600">{m.summary}</p>
      )}

      {processing && (
        <p className="mt-3 text-sm text-slate-500">
          Working on it. This usually takes 1 to 3 minutes. This page updates by itself.
        </p>
      )}

      {m.status === "failed" && (
        <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {m.errorMessage || "Something went wrong while processing this meeting."}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Link
          to={`/meetings/${m._id}`}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
        >
          Open
        </Link>
        {m.status === "failed" && (
          <button
            type="button"
            onClick={() => onRetry(m._id)}
            disabled={busy}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {busy ? "Retrying…" : "Retry"}
          </button>
        )}
        <button
          type="button"
          onClick={() => onDelete(m)}
          disabled={busy}
          className="ml-auto rounded-md px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
        >
          Delete
        </button>
      </div>
    </li>
  );
}

export default function Dashboard() {
  const [meetings, setMeetings] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);

  const [searchInput, setSearchInput] = useState("");
  const search = useDebounce(searchInput, 400);
  const [status, setStatus] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Only the newest request is allowed to update the screen
  const requestId = useRef(0);

  const load = useCallback(
    async ({ silent = false } = {}) => {
      const myId = ++requestId.current;
      if (!silent) setLoading(true);

      try {
        const params = { page, limit: PAGE_SIZE };
        if (search.trim()) params.search = search.trim();
        if (status) params.status = status;

        const { data } = await api.get("/meetings", { params });
        if (myId !== requestId.current) return; // an older answer, ignore it

        setMeetings(data.meetings);
        setTotal(data.total);
        setPages(data.pages);
        setError("");

        // If the last meeting on this page was deleted, go back one page
        if (data.pages > 0 && page > data.pages) setPage(data.pages);
      } catch (err) {
        if (myId !== requestId.current) return;
        // Don't wipe the list because of one failed background refresh
        if (!silent) setError(getErrorMessage(err));
      } finally {
        if (myId === requestId.current) setLoading(false);
      }
    },
    [page, search, status]
  );

  // Load when the page, search text or filter changes
  useEffect(() => {
    load();
  }, [load]);

  // A new search or filter always starts again from page 1
  useEffect(() => {
    setPage(1);
  }, [search, status]);

  // Live updates: only while something is still processing
  const hasActive = meetings.some((m) => ACTIVE.includes(m.status));
  useEffect(() => {
    if (!hasActive) return;
    const timer = setInterval(() => {
      if (!document.hidden) load({ silent: true });
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [hasActive, load]);

  async function handleRetry(id) {
    setBusyId(id);
    setActionError("");
    try {
      await api.post(`/meetings/${id}/retry`);
      await load({ silent: true });
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    setActionError("");
    try {
      await api.delete(`/meetings/${toDelete._id}`);
      setToDelete(null);
      await load({ silent: true });
    } catch (err) {
      setActionError(getErrorMessage(err));
      setToDelete(null);
    } finally {
      setDeleting(false);
    }
  }

  const filtering = Boolean(search.trim() || status);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Meetings</h1>
          <p className="text-sm text-slate-500">Your archive of recorded meetings</p>
        </div>
        <Link
          to="/upload"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + New meeting
        </Link>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <input
          type="search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search titles, summaries and transcripts…"
          maxLength={100}
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 sm:w-48"
        >
          {FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      {actionError && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {actionError}
        </div>
      )}

      {loading && <Spinner />}

      {!loading && error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-red-700">{error}</p>
          <button
            type="button"
            onClick={() => load()}
            className="mt-3 rounded-md border border-red-300 px-4 py-1.5 text-sm text-red-700 hover:bg-red-100"
          >
            Try again
          </button>
        </div>
      )}

      {!loading && !error && meetings.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
          {filtering ? (
            <>
              <p className="font-medium text-slate-700">No meetings match your search</p>
              <button
                type="button"
                onClick={() => {
                  setSearchInput("");
                  setStatus("");
                }}
                className="mt-3 text-sm text-blue-600 hover:underline"
              >
                Clear search and filter
              </button>
            </>
          ) : (
            <>
              <p className="font-medium text-slate-700">No meetings yet</p>
              <p className="mt-1 text-sm text-slate-500">
                Upload or record your first meeting to get a summary and action items.
              </p>
              <Link
                to="/upload"
                className="mt-4 inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Add a meeting
              </Link>
            </>
          )}
        </div>
      )}

      {!loading && !error && meetings.length > 0 && (
        <>
          <p className="mb-2 text-sm text-slate-500">
            {total} {total === 1 ? "meeting" : "meetings"}
            {filtering ? " found" : ""}
          </p>
          <ul className="space-y-3">
            {meetings.map((m) => (
              <MeetingRow
                key={m._id}
                m={m}
                busy={busyId === m._id}
                onRetry={handleRetry}
                onDelete={setToDelete}
              />
            ))}
          </ul>

          {pages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-4">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm hover:bg-slate-50 disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-sm text-slate-600">
                Page {page} of {pages}
              </span>
              <button
                type="button"
                disabled={page >= pages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm hover:bg-slate-50 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Delete this meeting?"
        message={`“${toDelete?.title ?? ""}” and its action items will be deleted permanently. If it is still processing, its results will be discarded.`}
        confirmText="Delete"
        danger
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}