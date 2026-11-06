const express = require("express");
const cors = require("cors");
const { notFound, errorHandler } = require("./middleware/errorHandle");

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173" }));
app.use(express.json());
app.get("/", (req, res) => res.send("API is running..."));
app.get("/api/health", (req, res) => res.json({ status: "ok" }));
app.use("/api/auth", require("./routes/auth"));
app.use("/api/meetings", require("./routes/meeting"));
app.use("/api/meetings", require("./routes/meetingExtras"));
app.use("/api/action-items", require("./routes/actionItems"));
app.use(notFound);
app.use(errorHandler);

module.exports = app;
