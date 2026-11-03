const fs = require("fs/promises");
const os = require("os");
const path = require("path");
const Meeting = require("../models/Metting");
const ActionItem = require("../models/ActionItem");
const { transcribeAudio } = require("./transcriber");
const { analyzeTranscript } = require("./analyzer");

async function processMeeting(meetingId) {
  const meeting = await Meeting.findById(meetingId).select("+audioData");
  if (!meeting) return;

  try {
    // ---------- Step 1: transcription (skipped if already done) ----------
    if (!meeting.transcript || meeting.transcript.length === 0) {
      if (!meeting.audioData || meeting.audioData.length === 0) {
        throw new Error("The audio file is no longer available. Please upload it again.");
      }

      meeting.status = "transcribing";
      meeting.errorMessage = undefined;
      await meeting.save();

      // transcribeAudio expects a path, so write the buffer to /tmp
      const ext = path.extname(meeting.originalFileName || "") || ".webm";
      const tmpPath = path.join(os.tmpdir(), `${meeting._id}${ext}`);
      await fs.writeFile(tmpPath, meeting.audioData);

      let result;
      try {
        result = await transcribeAudio(tmpPath);
      } finally {
        await fs.unlink(tmpPath).catch(() => {});
      }

      meeting.transcript = result.segments;
      meeting.fullText = result.fullText;
      meeting.duration = result.duration;
      meeting.audioData = undefined;   // transcript saved, audio no longer needed
      await meeting.save();
    }


    // ---------- Step 2: analysis ----------
    meeting.status = "analyzing";
    meeting.errorMessage = undefined;
    await meeting.save();

    const segments = meeting.transcript.map((s) => s.toObject());
    const analysis = await analyzeTranscript(segments, meeting.date);

    // Keep only speaker names the model actually found
    const names = {};
    for (const [label, name] of Object.entries(analysis.speakerNames || {})) {
      if (typeof name === "string" && name.trim()) names[label] = name.trim();
    }

    meeting.summary = analysis.summary;
    meeting.decisions = analysis.decisions;
    meeting.speakerNames = names;
    await meeting.save();

    // ---------- Step 3: action items ----------
    await ActionItem.deleteMany({ meetingId: meeting._id }); // safe on retry
    if (analysis.actionItems.length > 0) {
      await ActionItem.insertMany(
        analysis.actionItems.map((a) => ({
          meetingId: meeting._id,
          userId: meeting.userId,
          task: a.task,
          // If the owner is "Speaker B" and we know B is "Ali", use "Ali"
          owner: a.owner ? names[a.owner] || a.owner : null,
          deadline: a.deadline ? new Date(a.deadline) : null,
        }))
      );
    }

    meeting.status = "done";
    await meeting.save();
    console.log(`Meeting ${meeting._id} processed (${analysis.actionItems.length} action items)`);
  } catch (err) {
    console.error(`Meeting ${meetingId} failed:`, err.message);
    await Meeting.findByIdAndUpdate(meetingId, {
      status: "failed",
      errorMessage: String(err.message).slice(0, 300),
    });
  }
}

// If the server restarts mid-processing, those meetings would be stuck forever.
// Run this once at startup to mark them as failed so the user can retry.
async function recoverStuckMeetings() {
  const result = await Meeting.updateMany(
    { status: { $in: ["transcribing", "analyzing"] } },
    { status: "failed", errorMessage: "The server restarted while processing. Please retry." }
  );
  if (result.modifiedCount > 0) {
    console.log(`Marked ${result.modifiedCount} stuck meeting(s) as failed`);
  }
}

module.exports = { processMeeting, recoverStuckMeetings };