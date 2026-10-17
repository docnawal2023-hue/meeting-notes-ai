const mongoose = require("mongoose");

const actionItemSchema = new mongoose.Schema(
  {
    meetingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Meeting",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    task: { type: String, required: true, trim: true },
    owner: { type: String, default: null }, // null when the LLM is unsure
    ownerEmail: { type: String, default: null, lowercase: true, trim: true },
    deadline: { type: Date, default: null },
    status: { type: String, enum: ["open", "done"], default: "open" },
    emailSent: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ActionItem", actionItemSchema);