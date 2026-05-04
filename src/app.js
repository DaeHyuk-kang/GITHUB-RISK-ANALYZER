const express = require("express");
const cors = require("cors");
const analyzeRoutes = require("./routes/analyzeRoutes");
const webhookRoutes = require("./routes/webhookRoutes");

const app = express();

app.set("json spaces", 2);

app.use(cors({ origin: process.env.ALLOWED_ORIGIN || "*" }));

// Webhook routes must be mounted before express.json() so that
// express.raw() on the route can capture the raw body for signature verification.
app.use("/api/webhooks", webhookRoutes);

app.use(express.json());
app.use(express.static("public"));

app.use("/api", analyzeRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ success: false, message: "Internal Server Error" });
});

module.exports = app;
