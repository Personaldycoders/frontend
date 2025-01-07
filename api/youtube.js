import axios from "axios";

export default async function handler(req, res) {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: "No video URL provided" });
  }

  try {
    const apiUrl = `https://ytdlsigma.vercel.app/api/youtube?url=${url}`;
    const response = await axios.get(apiUrl);
    res.status(200).json(response.data);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch video data" });
  }
}
