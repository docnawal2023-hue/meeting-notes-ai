const express = require("express");
const Meeting = require("../models/Metting");
const ActionItem = require("../models/ActionItem");
const auth = require("../middleware/auth");
const validateId = require("../middleware/validateId");
const { processMeeting } = require("../services/pipeline");
const {
  cleanString,
  parseDate,
  parseEmail,
  httpError,
} = require("../../utils/validators");

const router = express.Router();
router.use(auth);

// PATCH /api/meetings/:id  (edit title, date, summary, decisions)
router.patch("/:id", validateId, async (req, res, next) => {
  try {
    const body = req.body || {};
    const updates = {};

    if ("title" in body) {
      const title = cleanString(body.title, 200);
      if (!title) throw httpError(400, "Title cannot be empty");
      updates.title = title;
    }
    if ("date" in body) {
      const date = parseDate(body.date);
      if (!date) throw httpError(400, "Invalid date");
      updates.date = date;
    }
    if ("summary" in body) {
      updates.summary = cleanString(body.summary, 5000) || "";
    }
    if ("decisions" in body) {
      if (!Array.isArray(body.decisions)) {
        throw httpError(400, "decisions must be a list");
      }
      updates.decisions = body.decisions
        .filter((d) => typeof d === "string" && d.trim())
        .map((d) => d.trim().slice(0, 500))
        .slice(0, 50);
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "Nothing to update" });
    }

    const meeting = await Meeting.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { $set: updates },
      { new: true, runValidators: true }
    ).select("-transcript -fullText");

    if (!meeting) return res.status(404).json({ message: "Meeting not found" });
    res.json({ meeting });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/meetings/:id/speakers
// Body: { "speakerNames": { "Speaker A": "Sara", "Speaker B": "" } }
router.patch("/:id/speakers", validateId, async (req, res, next) => {
  try {
    const incoming = req.body?.speakerNames;
    if (!incoming || typeof incoming !== "object" || Array.isArray(incoming)) {
      return res.status(400).json({ message: "speakerNames must be an object" });
    }

    const meeting = await Meeting.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!meeting) return res.status(404).json({ message: "Meeting not found" });

    if (!meeting.speakerNames) meeting.speakerNames = new Map();
    const labels = new Set(meeting.transcript.map((s) => s.speaker));
    const renames = [];

    for (const [label, rawName] of Object.entries(incoming)) {
      if (!labels.has(label)) {
        return res.status(400).json({ message: `Unknown speaker: ${label}` });
      }
      if (rawName !== null && typeof rawName !== "string") {
        return res.status(400).json({ message: "Speaker names must be text" });
      }

      const name = (rawName || "").trim().slice(0, 50);
      const oldDisplay = meeting.speakerNames.get(label) || label;
      const newDisplay = name || label;

      if (name) meeting.speakerNames.set(label, name);
      else meeting.speakerNames.delete(label);

      if (oldDisplay !== newDisplay) renames.push({ from: oldDisplay, to: newDisplay });
    }

    await meeting.save();

    // Keep task owners in sync with the new names
    for (const r of renames) {
      await ActionItem.updateMany(
        { meetingId: meeting._id, userId: req.user._id, owner: r.from },
        { owner: r.to }
      );
    }

    res.json({ meeting });
  } catch (err) {
    next(err);
  }
});

// POST /api/meetings/:id/retry  (only for failed meetings)
router.post("/:id/retry", validateId, async (req, res, next) => {
  try {
    const meeting = await Meeting.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id, status: "failed" },
      { $set: { status: "uploaded" }, $unset: { errorMessage: "" } },
      { new: true }
    );

    if (!meeting) {
      const exists = await Meeting.exists({ _id: req.params.id, userId: req.user._id });
      return res
        .status(exists ? 409 : 404)
        .json({ message: exists ? "Only failed meetings can be retried" : "Meeting not found" });
    }

    processMeeting(meeting._id).catch((err) => console.error("Pipeline crashed:", err));
    res.status(202).json({ meeting });
  } catch (err) {
    next(err);
  }
});

// GET /api/meetings/:id/action-items
router.get("/:id/action-items", validateId, async (req, res, next) => {
  try {
    const meeting = await Meeting.exists({ _id: req.params.id, userId: req.user._id });
    if (!meeting) return res.status(404).json({ message: "Meeting not found" });

    const actionItems = await ActionItem.find({ meetingId: req.params.id }).sort({
      createdAt: 1,
    });
    res.json({ actionItems });
  } catch (err) {
    next(err);
  }
});

// POST /api/meetings/:id/action-items  (add one manually)
router.post("/:id/action-items", validateId, async (req, res, next) => {
  try {
    const meeting = await Meeting.exists({ _id: req.params.id, userId: req.user._id });
    if (!meeting) return res.status(404).json({ message: "Meeting not found" });

    const body = req.body || {};
    const task = cleanString(body.task);
    if (!task) throw httpError(400, "Task is required");

    const actionItem = await ActionItem.create({
      meetingId: req.params.id,
      userId: req.user._id,
      task,
      owner: cleanString(body.owner, 100),
      ownerEmail: parseEmail(body.ownerEmail),
      deadline: parseDate(body.deadline),
    });

    res.status(201).json({ actionItem });
  } catch (err) {
    next(err);
  }
});

module.exports = router;