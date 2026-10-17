function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

// Returns a trimmed string, or null when empty/missing
function cleanString(value, max = 500) {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") throw httpError(400, "Expected text");
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

// Returns a Date, or null when empty. Throws on invalid dates.
function parseDate(value) {
  if (value === null || value === undefined || value === "") return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw httpError(400, "Invalid date");
  return d;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseEmail(value) {
  const s = cleanString(value, 254);
  if (s === null) return null;
  if (!EMAIL_RE.test(s)) throw httpError(400, "Invalid email address");
  return s.toLowerCase();
}

// Allow only these fields to change on an action item
function buildItemUpdates(body = {}) {
  const updates = {};

  if ("task" in body) {
    const task = cleanString(body.task);
    if (!task) throw httpError(400, "Task cannot be empty");
    updates.task = task;
  }
  if ("owner" in body) updates.owner = cleanString(body.owner, 100);
  if ("ownerEmail" in body) updates.ownerEmail = parseEmail(body.ownerEmail);
  if ("deadline" in body) updates.deadline = parseDate(body.deadline);
  if ("status" in body) {
    if (!["open", "done"].includes(body.status)) {
      throw httpError(400, "Status must be 'open' or 'done'");
    }
    updates.status = body.status;
  }
  return updates;
}

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

module.exports = {
  httpError,
  cleanString,
  parseDate,
  parseEmail,
  buildItemUpdates,
  escapeRegex,
};