const nodemailer = require("nodemailer");

let transporter;

function getTransporter() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    throw new Error("Email is not configured. Set SMTP_HOST, SMTP_USER and SMTP_PASS in .env");
  }
  if (!transporter) {
    const port = Number(SMTP_PORT) || 2525;
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
  }
  return transporter;
}

const FROM = () => process.env.MAIL_FROM || "MeetingNotes AI <no-reply@example.com>";

// Task text comes from an AI model, so never put it into HTML unescaped
function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtDate(d) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

async function sendTaskEmail({ to, name, meeting, items, sentBy }) {
  const title = String(meeting.title).replace(/[\r\n]+/g, " ").slice(0, 150);
  const meetingDate = fmtDate(meeting.date);
  const greeting = name ? `Hi ${name},` : "Hi,";

  const textLines = items.map((i) => {
    const due = fmtDate(i.deadline);
    return `- ${i.task}${due ? ` (due ${due})` : " (no deadline set)"}`;
  });

  const text = [
    greeting,
    "",
    `Here ${items.length === 1 ? "is your action item" : "are your action items"} from the meeting "${title}"${meetingDate ? ` on ${meetingDate}` : ""}:`,
    "",
    ...textLines,
    "",
    sentBy ? `Sent by ${sentBy} using MeetingNotes AI.` : "Sent using MeetingNotes AI.",
  ].join("\n");

  const rows = items
    .map((i) => {
      const due = fmtDate(i.deadline);
      return `<li style="margin-bottom:8px;"><strong>${esc(i.task)}</strong><br><span style="color:#64748b;">${
        due ? `Due ${esc(due)}` : "No deadline set"
      }</span></li>`;
    })
    .join("");

  const html = `
<div style="font-family:Arial,sans-serif;max-width:560px;color:#1e293b;">
  <p>${esc(greeting)}</p>
  <p>Here ${items.length === 1 ? "is your action item" : "are your action items"} from the meeting
     <strong>${esc(title)}</strong>${meetingDate ? ` on ${esc(meetingDate)}` : ""}:</p>
  <ul style="padding-left:20px;">${rows}</ul>
  <p style="color:#64748b;font-size:13px;">${
    sentBy ? `Sent by ${esc(sentBy)} using MeetingNotes AI.` : "Sent using MeetingNotes AI."
  }</p>
</div>`;

  return getTransporter().sendMail({
    from: FROM(),
    to,
    subject: `Action items from: ${title}`,
    text,
    html,
  });
}

module.exports = { getTransporter, sendTaskEmail, FROM };