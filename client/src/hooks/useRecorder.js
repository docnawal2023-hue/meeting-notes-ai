import { useCallback, useEffect, useRef, useState } from "react";

const MAX_SECONDS = 90 * 60; // auto-stop after 90 minutes

// Browsers support different formats, so we pick the first one that works.
// Chrome/Edge: webm, Firefox: ogg, Safari: mp4
const MIME_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
  "audio/mp4",
];

function pickMimeType() {
  if (typeof MediaRecorder === "undefined") return "";
  return MIME_CANDIDATES.find((t) => MediaRecorder.isTypeSupported(t)) || "";
}

function extensionFor(mime) {
  if (mime.includes("webm")) return "webm";
  if (mime.includes("ogg")) return "ogg";
  if (mime.includes("mp4")) return "m4a";
  return "webm";
}

function friendlyError(err) {
  switch (err?.name) {
    case "NotAllowedError":
    case "SecurityError":
      return "Microphone access was blocked. Click the lock icon in the address bar, allow the microphone, then try again.";
    case "NotFoundError":
      return "No microphone was found. Connect one and try again.";
    case "NotReadableError":
      return "Your microphone is being used by another app. Close it and try again.";
    default:
      return "Could not start recording. You can upload a file instead.";
  }
}

export default function useRecorder() {
  const [status, setStatus] = useState("idle"); // idle | recording | stopped
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState("");
  const [recording, setRecording] = useState(null); // { file, url }

  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const startRef = useRef(0);
  const urlRef = useRef(null);

  // Turn off the microphone (removes the red "recording" icon in the browser tab)
  const releaseMic = useCallback(() => {
    clearInterval(timerRef.current);
    timerRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const clearRecording = useCallback(() => {
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
    setRecording(null);
  }, []);

  const stop = useCallback(() => {
    const r = recorderRef.current;
    if (r && r.state !== "inactive") r.stop();
  }, []);

  const start = useCallback(async () => {
    if (recorderRef.current && recorderRef.current.state === "recording") return;
    setError("");

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("Recording is not supported in this browser. Please upload a file instead.");
      return;
    }
    if (!window.isSecureContext) {
      setError("Recording needs a secure connection (https or localhost).");
      return;
    }

    clearRecording();
    setSeconds(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = pickMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onerror = () => {
        releaseMic();
        recorderRef.current = null;
        setStatus("idle");
        setError("Recording failed. Please try again or upload a file.");
      };

      recorder.onstop = () => {
        const type = recorder.mimeType || mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type });
        releaseMic();
        recorderRef.current = null;

        if (blob.size === 0) {
          setStatus("idle");
          setError("No audio was captured. Check your microphone and try again.");
          return;
        }

        const file = new File([blob], `recording-${Date.now()}.${extensionFor(type)}`, { type });
        const url = URL.createObjectURL(blob);
        urlRef.current = url;
        setRecording({ file, url });
        setStatus("stopped");
      };

      // Ask for a piece of audio every second, so long recordings don't sit in one huge chunk
      recorder.start(1000);
      startRef.current = Date.now();
      setStatus("recording");

      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startRef.current) / 1000);
        setSeconds(elapsed);
        if (elapsed >= MAX_SECONDS) stop();
      }, 500);
    } catch (err) {
      releaseMic();
      recorderRef.current = null;
      setStatus("idle");
      setError(friendlyError(err));
    }
  }, [clearRecording, releaseMic, stop]);

  const discard = useCallback(() => {
    clearRecording();
    setSeconds(0);
    setError("");
    setStatus("idle");
  }, [clearRecording]);

  // If the user leaves the page, turn off the mic and free memory
  useEffect(() => {
    return () => {
      const r = recorderRef.current;
      if (r) {
        r.onstop = null;
        r.ondataavailable = null;
        if (r.state !== "inactive") r.stop();
      }
      releaseMic();
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, [releaseMic]);

  return { status, seconds, error, recording, start, stop, discard };
}