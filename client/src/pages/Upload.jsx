import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { getErrorMessage } from "../api";
import AudioRecorder from "../components/AudioRecorder.jsx";
import { ALLOWED_EXT, MAX_MB, formatBytes, todayLocal } from "../utils/helper";

function validateFile(file) {
  const dot = file.name.lastIndexOf(".");
  const ext = dot >= 0 ? file.name.slice(dot).toLowerCase() : "";

  if (!ALLOWED_EXT.includes(ext)) {
    return `Unsupported file type. Allowed: ${ALLOWED_EXT.join(", ")}`;
  }
  if (file.size === 0) return "This file is empty";
  if (file.size > MAX_MB * 1024 * 1024) {
    return `File is too large (${formatBytes(file.size)}). Maximum is ${MAX_MB} MB`;
  }
  return null;
}

export default function Upload() {
  const navigate = useNavigate();
  const abortRef = useRef(null);

  const [tab, setTab] = useState("upload"); // upload | record
  const [pickedFile, setPickedFile] = useState(null);
  const [recordedFile, setRecordedFile] = useState(null);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(todayLocal());
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);

  function choose(file) {
    setError("");
    if (!file) return;
    const problem = validateFile(file);
    if (problem) {
      setPickedFile(null);
      setError(problem);
      return;
    }
    setPickedFile(file);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    if (uploading) return;
    choose(e.dataTransfer.files?.[0]);
  }

  function handleCancel() {
    abortRef.current?.abort();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (uploading) return;
    setError("");

    const file = tab === "upload" ? pickedFile : recordedFile;
    if (!file) {
      return setError(
        tab === "upload" ? "Please choose an audio file first" : "Please record something first"
      );
    }
    const problem = validateFile(file);
    if (problem) return setError(problem);

    // Text fields first, then the file
    const form = new FormData();
    form.append("title", title.trim() || (tab === "record" ? `Recording ${date}` : ""));
    form.append("date", date);
    form.append("audio", file); // the name must be "audio"

    const controller = new AbortController();
    abortRef.current = controller;
    setUploading(true);
    setProgress(0);

    try {
      // Do NOT set Content-Type by hand. The browser adds the correct multipart boundary.
      await api.post("/meetings/upload", form, {
        signal: controller.signal,
        onUploadProgress: (ev) => {
          if (ev.total) setProgress(Math.round((ev.loaded * 100) / ev.total));
        },
      });
      navigate("/dashboard");
    } catch (err) {
      if (err.code === "ERR_CANCELED") {
        setError("Upload cancelled");
      } else {
        setError(getErrorMessage(err));
      }
    } finally {
      setUploading(false);
    }
  }

  const tabClass = (name) =>
    `flex-1 py-2 text-sm font-medium rounded-md ${
      tab === name ? "bg-white shadow text-blue-700" : "text-slate-600 hover:text-slate-800"
    }`;

  const inputClass =
    "w-full rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-800">New meeting</h1>
      <p className="text-slate-500 mb-6">
        Upload a recording or record in your browser. The app will write the transcript, summary and action items.
      </p>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-6 space-y-5">
        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
          <button type="button" disabled={uploading} onClick={() => setTab("upload")} className={tabClass("upload")}>
            Upload file
          </button>
          <button type="button" disabled={uploading} onClick={() => setTab("record")} className={tabClass("record")}>
            Record
          </button>
        </div>

        {/* Upload tab */}
        <div className={tab === "upload" ? "" : "hidden"}>
          <label
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`block cursor-pointer rounded-xl border-2 border-dashed p-8 text-center ${
              dragOver ? "border-blue-500 bg-blue-50" : "border-slate-300 hover:bg-slate-50"
            }`}
          >
            <input
              type="file"
              accept="audio/*,.mp3,.wav,.m4a,.mp4,.webm,.ogg,.aac,.flac"
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                choose(e.target.files?.[0]);
                e.target.value = ""; // lets you pick the same file again
              }}
            />
            {pickedFile ? (
              <div>
                <p className="font-medium text-slate-800 break-all">{pickedFile.name}</p>
                <p className="text-sm text-slate-500">{formatBytes(pickedFile.size)}</p>
                <button
                  type="button"
                  disabled={uploading}
                  onClick={(e) => {
                    e.preventDefault();
                    setPickedFile(null);
                  }}
                  className="mt-2 text-sm text-red-600 hover:underline"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div>
                <p className="font-medium text-slate-700">Click to choose a file, or drop it here</p>
                <p className="text-xs text-slate-500 mt-1">
                  MP3, WAV, M4A, MP4, WEBM, OGG, AAC, FLAC · up to {MAX_MB} MB
                </p>
              </div>
            )}
          </label>
        </div>

        {/* Record tab (kept mounted so a recording is not lost when you switch tabs) */}
        <div className={tab === "record" ? "" : "hidden"}>
          <AudioRecorder onRecorded={setRecordedFile} disabled={uploading} />
        </div>

        {/* Details */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Title (optional)</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            placeholder="e.g. Weekly team sync"
            disabled={uploading}
            className={inputClass}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Meeting date</label>
          <input
            type="date"
            value={date}
            max={todayLocal()}
            onChange={(e) => setDate(e.target.value || todayLocal())}
            disabled={uploading}
            className={inputClass}
          />
          <p className="text-xs text-slate-500 mt-1">
            Used to turn phrases like “next Friday” into real deadline dates.
          </p>
        </div>

        {/* Progress */}
        {uploading && (
          <div>
            <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
              <div className="h-2 bg-blue-600 transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {progress < 100 ? `Uploading… ${progress}%` : "Upload complete. Saving…"}
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={uploading}
            className="flex-1 rounded-md bg-blue-600 py-2.5 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {uploading ? `Uploading ${progress}%` : "Upload and analyze"}
          </button>
          {uploading && (
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-md border border-slate-300 px-4 hover:bg-slate-100"
            >
              Cancel
            </button>
          )}
        </div>

        <p className="text-xs text-slate-500">
          Processing usually takes 1 to 3 minutes for a short recording. After uploading, you can leave this page.
        </p>
      </form>
    </div>
  );
}