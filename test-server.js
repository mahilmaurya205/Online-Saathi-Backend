const express = require("express");
const app = express();

app.get("/ping", (req, res) => {
  console.log("PING REQUEST RECEIVED");
  res.json({ message: "pong" });
});

app.use((err, req, res, next) => {
  console.error("ERROR:", err);
  res.status(500).json({ message: "error", error: err.message });
});

app.listen(3006, () => {
  console.log("Test server on port 3006");
});
