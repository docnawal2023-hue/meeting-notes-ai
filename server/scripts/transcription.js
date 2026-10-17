require("dotenv").config();
const { AssemblyAI } = require("assemblyai");
const fs = require("fs");
const path = require("path");

const client = new AssemblyAI({
  apiKey: process.env.ASSEMBLYAI_API_KEY,
});

async function main() {
  const audioPath = path.join(__dirname, "../samples/meeting2.wav");

  /*check file is present*/
  if (!fs.existsSync(audioPath)) {
    console.error("Audio file not found:", audioPath);
    process.exit(1);
  }
  /*after checking tell user that we are uploading and transcribing*/
  console.log("Uploading and transcribing... (this can take a minute)");

  /*transcribe the audio file with speaker labels*/
  const transcript = await client.transcripts.transcribe({
    audio: audioPath,
    speaker_labels: true,
  });
  /*if the transcript has an error, log it and exit*/
  if (transcript.status === "error") {
    console.error("Transcription failed:", transcript.error);
    process.exit(1);
  }

  /* Convert to our own clean format */
  const segments = (transcript.utterances || []).map((u) => ({
    speaker: `Speaker ${u.speaker}`,
    text: u.text,
    start: u.start / 1000, // ms -> seconds
    end: u.end / 1000,
  }));

  /* Save the transcript to a JSON file */
  const output = {
    fullText: transcript.text,
    duration: transcript.audio_duration,
    segments,
  };

  fs.writeFileSync(
    path.join(__dirname, "../samples/meeting2.transcript.json"),
    //output,replacer,spaces
    JSON.stringify(output, null, 2)
  );

  console.log("\n--- TRANSCRIPT WITH SPEAKERS ---\n");
  segments.forEach((s) => console.log(`${s.speaker}: ${s.text}`));
  console.log("\nSaved to samples/meeting2.transcript.json");
}

main().catch((err) => console.error("Error:", err.message));