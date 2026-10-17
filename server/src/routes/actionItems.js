const express = require("express");
const mongoose = require("mongoose");
const ActionItem = require("../models/ActionItem");
const auth = require("../middleware/auth");
const validateId = require("../middleware/validateId");
const { buildItemUpdates } = require("../../utils/validators");

const router = express.Router();
router.use(auth);

// GET /api/action-items?status=open&meetingId=...
// All my tasks across meetings (used by the Tasks page)
router.get("/", async (req, res, next) => {
  try {
    const filter = { userId: req.user._id };

    if (["open", "done"].includes(req.query.status)) {
      filter.status = req.query.status;
    }
    if (req.query.meetingId) {
      if (!mongoose.isValidObjectId(req.query.meetingId)) {
        return res.status(400).json({ message: "Invalid meetingId" });
      }
      filter.meetingId = req.query.meetingId;
    }

    const raw = await ActionItem.find(filter)
      .populate("meetingId", "title date")
      .lean();

    const items = raw.map((item) => ({
      ...item,
      meeting: item.meetingId, // { _id, title, date }
      meetingId: item.meetingId?._id || item.meetingId,
    }));

    // Open tasks first, then earliest deadline first, no-deadline last
    items.sort((a, b) => {
      if (a.status !== b.status) return a.status === "open" ? -1 : 1;
      const da = a.deadline ? new Date(a.deadline).getTime() : Infinity;
      const db = b.deadline ? new Date(b.deadline).getTime() : Infinity;
      return da - db;
    });

    res.json({ actionItems: items });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/action-items/:id
// Body: any of task, owner, ownerEmail, deadline, status
// Optional: applyToSameOwner: true  (copies the email to this owner's other tasks)
router.patch("/:id", validateId, async (req, res, next) => {
  try {
    const updates = buildItemUpdates(req.body);

    const item = await ActionItem.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!item) {
      return res.status(404).json({ message: "Action item not found" });
    }

    // If anything the email would show has changed, allow it to be sent again
    const changedForEmail = ["task", "owner", "ownerEmail", "deadline"].some(
      (key) => key in updates && String(updates[key] ?? "") !== String(item[key] ?? "")
    );

    item.set(updates);
    if (changedForEmail) item.emailSent = false;
    await item.save();

    if (req.body.applyToSameOwner && "ownerEmail" in updates && item.owner) {
      await ActionItem.updateMany(
        {
          meetingId: item.meetingId,
          userId: req.user._id,
          owner: item.owner,
          _id: { $ne: item._id },
        },
        { ownerEmail: updates.ownerEmail, emailSent: false }
      );
    }

    res.json({ actionItem: item });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/action-items/:id
router.delete("/:id", validateId, async (req, res, next) => {
  try {
    const item = await ActionItem.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!item) {
      return res.status(404).json({ message: "Action item not found" });
    }
    res.json({ message: "Action item deleted" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;