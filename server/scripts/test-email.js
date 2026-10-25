require("dotenv").config();
const { getTransporter, FROM } = require("../src/services/emailer");

(async () => {
  const t = getTransporter();
  await t.verify();
  console.log("SMTP connection OK");

  const info = await t.sendMail({
    from: FROM(),
    to: "test@example.com",
    subject: "Test email from MeetingNotes AI",
    text: "If you can read this in Mailtrap, email works.",
  });
  console.log("Sent. Message id:", info.messageId);
})().catch((err) => {
  console.error("Email failed:", err.message);
  process.exit(1);
});