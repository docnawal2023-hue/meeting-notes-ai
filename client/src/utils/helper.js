export const MAX_MB = 100; // must match the server limit
export const ALLOWED_EXT = [
  ".mp3",
  ".wav",
  ".m4a",
  ".mp4",
  ".webm",
  ".ogg",
  ".aac",
  ".flac",
];

export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// 75 -> "01:15", 3725 -> "1:02:05"
export function formatTimer(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

// Today's date as YYYY-MM-DD in the user's own time zone
export function todayLocal() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}
// Meeting dates are saved as midnight UTC, so we show them in UTC too.
// Otherwise users west of UTC would see the day before.
export function formatMeetingDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

// 45 -> "45 sec", 300 -> "5 min", 4500 -> "1 h 15 min"
export function formatDuration(seconds) {
  if (!seconds) return "";
  if (seconds < 60) return `${Math.round(seconds)} sec`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
}
// day 11
// Tailwind needs complete class names, so they are written out in full
export const SPEAKER_COLORS = [
  { text: "text-blue-700", dot: "bg-blue-500" },
  { text: "text-emerald-700", dot: "bg-emerald-500" },
  { text: "text-purple-700", dot: "bg-purple-500" },
  { text: "text-orange-700", dot: "bg-orange-500" },
  { text: "text-pink-700", dot: "bg-pink-500" },
  { text: "text-teal-700", dot: "bg-teal-500" },
];