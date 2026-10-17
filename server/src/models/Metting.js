const mongoose = require("mongoose");

const segmentSchema = new mongoose.Schema(
  {
    speaker: String, // "Speaker A"
    text: String,
    start: Number, // seconds
    end: Number,
  },
  { _id: false }
);

const meetingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    date: { type: Date, default: Date.now }, // meeting date, used for "next Friday"
    audioPath: String,
    originalFileName: String,
    duration: Number,

    status: {
      type: String,
      enum: ["uploaded", "transcribing", "analyzing", "done", "failed"],
      default: "uploaded",
    },
    errorMessage: String,

    transcript: [segmentSchema],
    fullText: String,
    speakerNames: { type: Map, of: String, default: {} }, // { "Speaker A": "Sara" }

    summary: String,
    decisions: [String],
  },
  { timestamps: true }
);

// Powers the search feature later
meetingSchema.index({ title: "text", fullText: "text", summary: "text" });

module.exports = mongoose.model("Meeting", meetingSchema);