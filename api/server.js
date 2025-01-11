const express = require('express');
const path = require('path');
const axios = require('axios');

const app = express();

// In-memory cache
const cache = new Map();

const SaveTube = {
    qualities: {
        audio: { 1: '32', 2: '64', 3: '128', 4: '192' },
        video: { 1: '144', 2: '240', 3: '360', 4: '480', 5: '720', 6: '1080', 7: '1440', 8: '2160' }
    },

    headers: {
        'accept': '*/*',
        'referer': 'https://ytshorts.savetube.me/',
        'origin': 'https://ytshorts.savetube.me/',
        'user-agent': 'Postify/1.0.0',
        'Content-Type': 'application/json'
    },

    cdn() {
        return Math.floor(Math.random() * 11) + 51;
    },

    checkQuality(type, qualityIndex) {
        if (!this.qualities[type] || !this.qualities[type][qualityIndex]) {
            throw new Error(`❌ Kualitas ${type} tidak valid. Pilih salah satu: ${Object.keys(this.qualities[type]).join(', ')}`);
        }
    },

    async fetchData(url, cdn, body = {}) {
        const headers = {
            ...this.headers,
            'authority': `cdn${cdn}.savetube.su`
        };

        try {
            const response = await axios.post(url, body, {
                headers,
                timeout: 10000 // Timeout 5 detik
            });
            return response.data;
        } catch (error) {
            console.error("Fetch error:", error.message);
            throw new Error("❌ Gagal mengambil data dari server.");
        }
    },

    dLink(cdnUrl) {
        return `https://${cdnUrl}/download`;
    },

    async dl(link, qualityIndex, type) {
        this.checkQuality(type, qualityIndex);

        let cdnUrl = `cdn${this.cdn()}.savetube.su`;

        const fetchVideoInfo = this.fetchData(`https://${cdnUrl}/info`, cdnUrl, { url: link });
        const fetchDownload = fetchVideoInfo.then((videoInfo) => {
            const downloadBody = {
                downloadType: type,
                quality: this.qualities[type][qualityIndex],
                key: videoInfo.data.key
            };
            return this.fetchData(this.dLink(cdnUrl), cdnUrl, downloadBody);
        });

        try {
            const [videoInfo, dlRes] = await Promise.all([fetchVideoInfo, fetchDownload]);

            if (!dlRes.data || !dlRes.data.downloadUrl) {
                throw new Error("❌ Gagal mendapatkan URL download.");
            }

            return {
                link: dlRes.data.downloadUrl,
                thumbnail: videoInfo.data.thumbnail,
                duration: videoInfo.data.duration,
                durationLabel: videoInfo.data.durationLabel,
                title: videoInfo.data.title,
                quality: this.qualities[type][qualityIndex]
            };
        } catch (error) {
            throw new Error("❌ Gagal mengambil data dari server atau URL download.");
        }
    }
};

// API untuk mendapatkan video
app.get('/api/youtube', async (req, res) => {
    const { url } = req.query;

    if (!url) {
        return res.status(400).json({ error: 'Tidak ada URL yang diberikan' });
    }

    // Cek cache terlebih dahulu
    if (cache.has(url)) {
        return res.json(cache.get(url));
    }

    try {
        const videoData = await SaveTube.dl(url, 5, 'video'); // Video 720p
        const audioData = await SaveTube.dl(url, 3, 'audio'); // Audio 128kbps

        const result = {
            video: videoData.link,
            audio: audioData.link,
            title: videoData.title,
            thumbnail: videoData.thumbnail,
            duration: videoData.durationLabel,
            description: 'Deskripsi video'
        };

        // Simpan ke cache
        cache.set(url, result);

        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Menyajikan file statis (misalnya halaman HTML)
app.use(express.static(path.join(__dirname, '../public')));

module.exports = app;
