const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const MAX_MB = 100;
const ALLOWED_EXT = [".mp3", ".wav", ".m4a", ".mp4", ".webm", ".ogg", ".aac", ".flac"];

const uploadDir = path.join(__dirname, "../../uploads");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    // Random name, so two users can never overwrite each other's file
    const unique = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}`;
    cb(null, unique + path.extname(file.originalname).toLowerCase());
  },
});

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXT.includes(ext)) {
    return cb(new Error(`Unsupported file type. Allowed: ${ALLOWED_EXT.join(", ")}`));
  }
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_MB * 1024 * 1024 },
});

module.exports = { upload, MAX_MB };