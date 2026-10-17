const express = require("express");
const mongoose = require("mongoose");
const Meeting = require("../models/Metting");
const ActionItem = require("../models/ActionItem");
const auth = require("../middleware/auth");
const path = require("path");
const { upload, MAX_MB } = require("../middleware/upload");
const { processMeeting } = require("../services/pipeline");
const {
  cleanString,
  parseDate,
  parseEmail,
  escapeRegex,
  httpError,
} = require("../../utils/validators");

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
const STATUSES = ["uploaded", "transcribing", "analyzing", "done", "failed"];

// Short piece of text around the match, to show in search results
function makeSnippet(meeting, query) {
  const needle = query.toLowerCase();
  for (const text of [meeting.fullText, meeting.summary, meeting.title]) {
    if (!text) continue;
    const i = text.toLowerCase().indexOf(needle);
    if (i !== -1) {
      const start = Math.max(0, i - 60);
      const end = Math.min(text.length, i + needle.length + 60);
      return (
        (start > 0 ? "…" : "") +
        text.slice(start, end).trim() +
        (end < text.length ? "…" : "")
      );
    }
  }
  return null;
}

// GET /api/meetings?search=&status=&page=&limit=
router.get("/", async (req, res, next) => {
  try {
    const filter = { userId: req.user._id };

    if (STATUSES.includes(req.query.status)) {
      filter.status = req.query.status;
    }

    const q = (req.query.search || "").trim().slice(0, 100);
    if (q) {
      const rx = new RegExp(escapeRegex(q), "i");
      filter.$or = [{ title: rx }, { summary: rx }, { fullText: rx }, { decisions: rx }];
    }

    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 50);

    // fullText is only needed to build search snippets
    const hidden = q ? "-transcript -audioPath" : "-transcript -fullText -audioPath";

    const [meetings, total] = await Promise.all([
      Meeting.find(filter)
        .select(hidden)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Meeting.countDocuments(filter),
    ]);

    if (q) {
      meetings.forEach((m) => {
        m.snippet = makeSnippet(m, q);
        delete m.fullText;
      });
    }

    res.json({ meetings, total, page, pages: Math.ceil(total / limit) });
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