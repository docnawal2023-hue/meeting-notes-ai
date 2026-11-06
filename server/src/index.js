require("dotenv").config();
const connectDB = require("./config/db");
const { recoverStuckMeetings } = require("./services/pipeline");
const app = require("./app");

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