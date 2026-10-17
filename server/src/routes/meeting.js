const express = require("express");
const mongoose = require("mongoose");
const Meeting = require("../models/Metting");
const ActionItem = require("../models/ActionItem");
const auth = require("../middleware/auth");
const path = require("path");
const { upload, MAX_MB } = require("../middleware/upload");
const { processMeeting } = require("../services/pipeline");

const router = express.Router();

// Every route in this file requires login
router.use(auth);


// Reject bad ids early
function checkId(req, res, next) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: "Invalid meeting id" });
  }
  next();
}
// POST /api/meetings/upload  (form-data: audio, title, date)
router.post(
  "/upload",
  (req, res, next) => {
    upload.single("audio")(req, res, (err) => {
      if (err) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({ message: `File is too large (max ${MAX_MB} MB)` });
        }
        return res.status(400).json({ message: err.message });
      }
      next();
    });
  },
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No audio file received (field name must be 'audio')" });
      }

      const title =
        (req.body.title || "").trim() || path.parse(req.file.originalname).name;

      let date = req.body.date ? new Date(req.body.date) : new Date();
      if (Number.isNaN(date.getTime())) date = new Date();

      const meeting = await Meeting.create({
        userId: req.user._id,
        title,
        date,
        audioPath: req.file.path,
        originalFileName: req.file.originalname,
      });

      // Start in the background. Do NOT await, so the user gets a reply now.
      processMeeting(meeting._id).catch((err) =>
        console.error("Pipeline crashed:", err)
      );

      res.status(202).json({ meeting });
    } catch (err) {
      next(err);
    }
  }
);
// GET /api/meetings  -> my meetings, newest first
router.get("/", async (req, res, next) => {
  try {
    const meetings = await Meeting.find({ userId: req.user._id })
      .select("-transcript -fullText") // keep the list light
      .sort({ createdAt: -1 });
    res.json({ meetings });
  } catch (err) {
    next(err);
  }
});

// POST /api/meetings -> temporary: create a meeting record (for testing)
router.post("/", async (req, res, next) => {
  try {
    const { title, date } = req.body;
    if (!title) {
      return res.status(400).json({ message: "Title is required" });
    }
    const meeting = await Meeting.create({
      userId: req.user._id,
      title,
      date: date || Date.now(),
    });
    res.status(201).json({ meeting });
  } catch (err) {
    next(err);
  }
});

// GET /api/meetings/:id -> one meeting with its action items
router.get("/:id", checkId, async (req, res, next) => {
  try {
    const meeting = await Meeting.findOne({ _id: req.params.id, userId: req.user._id });
    if (!meeting) {
      return res.status(404).json({ message: "Meeting not found" });
    }
    const actionItems = await ActionItem.find({ meetingId: meeting._id });
    res.json({ meeting, actionItems });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/meetings/:id
router.delete("/:id", checkId, async (req, res, next) => {
  try {
    const meeting = await Meeting.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!meeting) {
      return res.status(404).json({ message: "Meeting not found" });
    }
    await ActionItem.deleteMany({ meetingId: meeting._id });
    res.json({ message: "Meeting deleted" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;