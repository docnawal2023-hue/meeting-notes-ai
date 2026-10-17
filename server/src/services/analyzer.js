/**
 * Utilities for transforming raw meeting transcript segments into a structured
 * summary, decisions, and action items using the Gemini model.
 * @module services/analyzer
 */

const prompt = require("../../utils/constant").analyzerPrompt;
const SYSTEM_PROMPT = prompt.prompt;
const OUTPUT_SHAPE = prompt.outputShape;

/**
 * Formats a number of seconds as a mm:ss timestamp.
 *
 * @param {number} seconds - Total elapsed seconds to convert.
 * @returns {string} A zero-padded time string in the form "MM:SS".
 */
function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * Builds the user-facing prompt that instructs the model how to parse a meeting transcript.
 *
 * @param {Array<{ start?: number, speaker?: string, text?: string }>} segments - Transcript entries ordered by time.
 * @param {string|Date} meetingDate - The meeting date used to provide context to the model.
 * @returns {string} A complete prompt containing the extraction schema and transcript content.
 */
function buildUserPrompt(segments, meetingDate) {
  const d = new Date(meetingDate);
  const iso = d.toISOString().slice(0, 10);
  const weekday = d.toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });

  const lines = segments
    .map((s) => `[${formatTime(s.start || 0)}] ${s.speaker}: ${s.text}`)
    .join("\n");

  return `Meeting date: ${weekday}, ${iso}

Return JSON in exactly this structure:
${OUTPUT_SHAPE}

TRANSCRIPT:
${lines}`;
}

/**
 * Sends the assembled prompt to the configured Gemini model and returns the raw
 * generated response text.
 *
 * @async
 * @param {string} userPrompt - The final prompt payload to send to Gemini.
 * @returns {Promise<string>} The raw model output as a string.
 * @throws {Error} If the API request fails or the model returns no content.
 */
async function callGemini(userPrompt) {
  const model = process.env.GEMINI_MODEL || "gemini-3.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": process.env.GEMINI_API_KEY,
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${body}`);
  }

  const data = await res.json();
  const text = (data.candidates?.[0]?.content?.parts || [])
    .map((p) => p.text || "")
    .join("");

  if (!text) throw new Error("Model returned an empty response");
  return text;
}

/**
 * Normalizes a raw model response by stripping any markdown code fences and
 * parsing the remaining text as JSON.
 *
 * @param {string} text - Raw JSON output returned by the model.
 * @returns {object} Parsed JSON payload.
 * @throws {SyntaxError} If the response cannot be parsed as valid JSON.
 */
function parseJson(text) {
  const cleaned = text.replace(/```json|```/g, "").trim();
  return JSON.parse(cleaned);
}

/**
 * Validates whether a date string is in YYYY-MM-DD format and represents a real date.
 *
 * @param {string} str - Date value to validate.
 * @returns {boolean} True when the date is valid; otherwise false.
 */
function isValidDate(str) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return false;
  return !Number.isNaN(new Date(str).getTime());
}

/**
 * Ensures the raw AI response matches the expected meeting-analysis schema and
 * strips out malformed or empty values before returning a safe object.
 *
 * @param {object} raw - Unprocessed JSON object returned by the model.
 * @returns {{ summary: string, decisions: string[], actionItems: Array<{ task: string, owner: string|null, deadline: string|null, deadlineText: string|null, evidence: string|null }>, speakerNames: object }}
 * @throws {Error} If the required top-level fields are missing or malformed.
 */
function validateAndClean(raw) {
  if (!raw || typeof raw !== "object") throw new Error("Result is not an object");
  if (typeof raw.summary !== "string") throw new Error("Missing summary");
  if (!Array.isArray(raw.decisions)) throw new Error("decisions must be an array");
  if (!Array.isArray(raw.actionItems)) throw new Error("actionItems must be an array");

  const str = (v) => (typeof v === "string" && v.trim() ? v.trim() : null);

  return {
    summary: raw.summary.trim(),
    decisions: raw.decisions.filter((d) => typeof d === "string" && d.trim()).map((d) => d.trim()),
    actionItems: raw.actionItems
      .filter((a) => a && str(a.task))
      .map((a) => ({
        task: a.task.trim(),
        owner: str(a.owner),
        deadline: str(a.deadline) && isValidDate(a.deadline.trim()) ? a.deadline.trim() : null,
        deadlineText: str(a.deadlineText),
        evidence: str(a.evidence),
      })),
    speakerNames:
      raw.speakerNames && typeof raw.speakerNames === "object" ? raw.speakerNames : {},
  };
}

/**
 * Analyzes a transcript and returns the cleaned, database-ready summary structure.
 * The function retries once when the model response fails to parse or validate.
 *
 * @async
 * @param {Array<{ start?: number, speaker?: string, text?: string }>} segments - Meeting transcript segments to analyze.
 * @param {string|Date} [meetingDate=new Date()] - Meeting date or timestamp used as request context.
 * @returns {Promise<{ summary: string, decisions: string[], actionItems: Array<{ task: string, owner: string|null, deadline: string|null, deadlineText: string|null, evidence: string|null }>, speakerNames: object }>} The normalized analysis result.
 * @throws {Error} If the transcript is empty or both analysis attempts fail.
 */
async function analyzeTranscript(segments, meetingDate = new Date()) {
  if (!Array.isArray(segments) || segments.length === 0) {
    throw new Error("Transcript is empty, nothing to analyze");
  }

  const prompt = buildUserPrompt(segments, meetingDate);
  let lastError;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const text = await callGemini(prompt);
      return validateAndClean(parseJson(text));
    } catch (err) {
      lastError = err;
      console.warn(`Attempt ${attempt} failed: ${err.message}`);
    }
  }
  throw new Error(`Analysis failed after retry: ${lastError.message}`);
}

module.exports = { analyzeTranscript };