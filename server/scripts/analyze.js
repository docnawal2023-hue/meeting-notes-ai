require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { analyzeTranscript } = require("../src/services/analyzer");

async function main() {
  const fileName = process.argv[2] || "meeting1.transcript.json";
  const meetingDate = process.argv[3] || new Date().toISOString().slice(0, 10);

  const inputPath = path.join(__dirname, "../samples", fileName);
  if (!fs.existsSync(inputPath)) {
    console.error("File not found:", inputPath);
    process.exit(1);
  }

  const transcript = JSON.parse(fs.readFileSync(inputPath, "utf8"));
  console.log(`Analyzing ${fileName} (meeting date: ${meetingDate})...\n`);

  const result = await analyzeTranscript(transcript.segments, meetingDate);

  const outName = fileName.replace(".transcript.json", ".analysis.json");
  fs.writeFileSync(
    path.join(__dirname, "../samples", outName),
    JSON.stringify(result, null, 2)
  );

  console.log("SUMMARY:\n" + result.summary + "\n");

  console.log("DECISIONS:");
  result.decisions.forEach((d, i) => console.log(`  ${i + 1}. ${d}`));
  if (!result.decisions.length) console.log("  (none)");

  console.log("\nACTION ITEMS:");
  result.actionItems.forEach((a, i) => {
    console.log(`  ${i + 1}. ${a.task}`);
    console.log(`     Owner: ${a.owner ?? "UNASSIGNED"}`);
    console.log(`     Deadline: ${a.deadline ?? "none"}${a.deadlineText ? ` ("${a.deadlineText}")` : ""}`);
    console.log(`     Evidence: ${a.evidence ?? "-"}`);
  });
  if (!result.actionItems.length) console.log("  (none)");

  console.log("\nSaved to samples/" + outName);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});