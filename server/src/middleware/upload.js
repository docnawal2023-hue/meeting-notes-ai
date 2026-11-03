const multer = require("multer");
const path = require("path");

const MAX_MB = 100;
const ALLOWED_EXT = [".mp3", ".wav", ".m4a", ".mp4", ".webm", ".ogg", ".aac", ".flac"];

// Keep the upload in memory: no disk access, works on Vercel
const storage = multer.memoryStorage();

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