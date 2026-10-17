require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const { notFound, errorHandler } = require("./middleware/errorHandle");
const { recoverStuckMeetings } = require("./services/pipeline");
const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173" }));
app.use(express.json());

app.get("/api/health", (req, res) => res.json({ status: "ok" }));
app.use("/api/auth", require("./routes/auth"));
app.use("/api/meetings", require("./routes/meeting"));

app.use(notFound);
app.use(errorHandler); // must be last

const PORT = process.env.PORT || 5000;

connectDB()
  .then(async () => {
    await recoverStuckMeetings();
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error("DB connection failed:", err.message);
    process.exit(1);
  });