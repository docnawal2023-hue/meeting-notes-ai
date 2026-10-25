import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api, { getErrorMessage } from "../api";
import Spinner from "../components/Spinner";
import StatusBadge from "../components/StautusBadge";
import TranscriptView from "../components/TranscriptView";
import ActionItemsPanel from "../components/ActionItemPanel";
import { formatDuration, formatMeetingDate } from "../utils/helper";
import SendEmailSection from "../components/SendEmailSection";

const ACTIVE = ["uploaded", "transcribing", "analyzing"];

export default function MeetingDetail() {
  const { id } = useParams();
  const [meeting, setMeeting] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(
    async ({ silent = false } = {}) => {
      try {
        const { data } = await api.get(`/meetings/${id}`);
        setMeeting(data.meeting);
        setItems(data.actionItems);
        setError("");
      } catch (err) {
        if (!silent) setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    },
    [id]
  );

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  // While the meeting is still processing, check again every 5 seconds
  const active = meeting && ACTIVE.includes(meeting.status);
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => {
      if (!document.hidden) load({ silent: true });
    }, 5000);
    return () => clearInterval(timer);
  }, [active, load]);

  if (loading) return <Spinner />;

  if (error || !meeting) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
        <p className="text-red-700">{error || "Meeting not found"}</p>
        <Link to="/dashboard" className="mt-3 inline-block text-sm text-blue-600 hover:underline">
          ← Back to meetings
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link to="/dashboard" className="text-sm text-blue-600 hover:underline">
          ← All meetings
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="break-words text-2xl font-bold text-slate-800">{meeting.title}</h1>
            <p className="text-sm text-slate-500">
              {formatMeetingDate(meeting.date)}
              {meeting.duration ? ` · ${formatDuration(meeting.duration)}` : ""}
            </p>
          </div>
          <StatusBadge status={meeting.status} />
        </div>
      </div>

      {active && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 text-sm text-blue-800">
          This meeting is still being processed. It usually takes 1 to 3 minutes. This page updates by itself.
        </div>
      )}

      {meeting.status === "failed" && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          <p className="font-medium">Processing failed</p>
          <p className="mt-1">{meeting.errorMessage || "Something went wrong."}</p>
          <Link to="/dashboard" className="mt-3 inline-block text-blue-700 underline">
            Go back to retry from the meetings list
          </Link>
        </div>
      )}

      {meeting.status === "done" && (
        <>
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-2 text-lg font-semibold text-slate-800">Summary</h2>
            <p className="text-slate-700">{meeting.summary || "No summary available."}</p>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-2 text-lg font-semibold text-slate-800">Decisions</h2>
            {meeting.decisions?.length ? (
              <ul className="list-disc space-y-1 pl-5 text-slate-700">
                {meeting.decisions.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">No decisions were found in this meeting.</p>
            )}
          </section>

          <ActionItemsPanel
            meetingId={meeting._id}
            items={items}
            onChanged={() => load({ silent: true })}
          />
                    <SendEmailSection
            meetingId={meeting._id}
            items={items}
            onChanged={() => load({ silent: true })}
          />

          <TranscriptView
            meetingId={meeting._id}
            transcript={meeting.transcript || []}
            speakerNames={meeting.speakerNames}
            onRenamed={() => load({ silent: true })}
          />
        </>
      )}
    </div>
  );
}