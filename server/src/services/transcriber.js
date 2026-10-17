const { AssemblyAI } = require("assemblyai");

let client;
function getClient() {
  if (!process.env.ASSEMBLYAI_API_KEY) {
    throw new Error("ASSEMBLYAI_API_KEY is missing in .env");
  }
  if (!client) {
    client = new AssemblyAI({ apiKey: process.env.ASSEMBLYAI_API_KEY });
  }
  return client;
}

// Returns { fullText, duration, segments: [{ speaker, text, start, end }] }
async function transcribeAudio(filePath) {
  const transcript = await getClient().transcripts.transcribe({
    audio: filePath,
    speaker_labels: true,
  });

  if (transcript.status === "error") {
    throw new Error(`Transcription failed: ${transcript.error}`);
  }

  const fullText = (transcript.text || "").trim();
  if (!fullText) {
    throw new Error("No speech was detected in this audio");
  }

  let segments = (transcript.utterances || []).map((u) => ({
    speaker: `Speaker ${u.speaker}`,
    text: u.text,
    start: u.start / 1000, // milliseconds to seconds
    end: u.end / 1000,
  }));

  // If speaker detection returned nothing, keep the text as one block
  if (segments.length === 0) {
    segments = [
      { speaker: "Speaker A", text: fullText, start: 0, end: transcript.audio_duration || 0 },
    ];
  }

  return { fullText, duration: transcript.audio_duration || 0, segments };
}

module.exports = { transcribeAudio };