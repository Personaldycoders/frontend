const express = require("express");
const axios = require("axios");

const app = express();

// API endpoint
app.get("/api/youtube", async (req, res) => {
  const { url } = req.query;
  if (!url) {
    return res.status(400).json({ error: "URL parameter is required" });
  }

  try {
    // Panggil API eksternal
    const response = await axios.get(`https://ytdlsigma.vercel.app/api/youtube?url=${encodeURIComponent(url)}`);
    res.json(response.data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch video data" });
  }
});

module.exports = app;
