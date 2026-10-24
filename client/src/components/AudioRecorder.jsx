import { useEffect } from "react";
import useRecorder from "../hooks/useRecorder";
import { formatBytes, formatTimer } from "../utils/helper";

export default function AudioRecorder({ onRecorded, disabled }) {
  const { status, seconds, error, recording, start, stop, discard } = useRecorder();

  // Tell the parent page which file we recorded (or null when discarded)
  useEffect(() => {
    onRecorded(recording ? recording.file : null);
  }, [recording, onRecorded]);

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center">
      {error && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700 text-left">
          {error}
        </div>
      )}

      {status === "idle" && (
        <>
          <p className="text-sm text-slate-600 mb-4">
            Click the button, allow microphone access, and start speaking.
          </p>
          <button
            type="button"
            onClick={start}
            disabled={disabled}
            className="rounded-full bg-red-600 px-6 py-3 text-white font-medium hover:bg-red-700 disabled:opacity-50"
          >
            ● Start recording
          </button>
        </>
      )}

      {status === "recording" && (
        <>
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="h-3 w-3 rounded-full bg-red-600 animate-pulse" />
            <span className="text-sm font-medium text-red-700">Recording</span>
          </div>
          <div className="text-4xl font-mono text-slate-800 mb-4">{formatTimer(seconds)}</div>
          <button
            type="button"
            onClick={stop}
            className="rounded-full bg-slate-800 px-6 py-3 text-white font-medium hover:bg-slate-900"
          >
            ■ Stop
          </button>
        </>
      )}

      {status === "stopped" && recording && (
        <>
          <p className="text-sm text-slate-600">
            Recorded {formatTimer(seconds)} · {formatBytes(recording.file.size)}
          </p>
          <audio controls src={recording.url} className="w-full my-3" />
          <p className="text-xs text-slate-500 mb-3">
            Play it back first to make sure your voice is clear.
          </p>
          <button
            type="button"
            onClick={discard}
            disabled={disabled}
            className="text-sm rounded-md border border-slate-300 px-4 py-2 hover:bg-white disabled:opacity-50"
          >
            Discard and record again
          </button>
        </>
      )}
    </div>
  );
}