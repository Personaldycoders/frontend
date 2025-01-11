const express = require('express');
const path = require('path');
const axios = require('axios');

const app = express();

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
            const response = await axios.post(url, body, { headers });
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

        let cdnNumber = this.cdn();
        let cdnUrl = `cdn${cdnNumber}.savetube.su`;

        // Retry mechanism if the first CDN fails
        let videoInfo, dlRes;
        try {
            videoInfo = await this.fetchData(`https://${cdnUrl}/info`, cdnNumber, { url: link });
            const downloadBody = {
                downloadType: type,
                quality: this.qualities[type][qualityIndex],
                key: videoInfo.data.key
            };

            dlRes = await this.fetchData(this.dLink(cdnUrl), cdnNumber, downloadBody);
        } catch (error) {
            // Retry with another CDN if the first one fails
            cdnNumber = this.cdn();
            cdnUrl = `cdn${cdnNumber}.savetube.su`;

            try {
                videoInfo = await this.fetchData(`https://${cdnUrl}/info`, cdnNumber, { url: link });
                const downloadBody = {
                    downloadType: type,
                    quality: this.qualities[type][qualityIndex],
                    key: videoInfo.data.key
                };

                dlRes = await this.fetchData(this.dLink(cdnUrl), cdnNumber, downloadBody);
            } catch (retryError) {
                throw new Error("❌ Gagal mendapatkan URL download setelah mencoba beberapa CDN.");
            }
        }

        if (!dlRes.data || !dlRes.data.downloadUrl) {
            throw new Error("❌ Gagal mendapatkan URL download.");
        }

        return {
            link: dlRes.data.downloadUrl,
            thumbnail: videoInfo.data.thumbnail,  // Menambahkan thumbnail
            duration: videoInfo.data.duration,
            durationLabel: videoInfo.data.durationLabel,
            title: videoInfo.data.title,
            quality: this.qualities[type][qualityIndex]
        };
    }
};

// API route untuk mengambil data video
app.get('/api/youtube', async (req, res) => {
    const { url } = req.query;

    if (!url) {
        return res.status(400).json({ error: 'Tidak ada URL yang diberikan' });
    }

    try {
        // Mengambil data MP4
        const videoData = await SaveTube.dl(url, 5, 'video');  // MP4, kualitas 720p (5)
        
        // Mengambil data MP3
        const audioData = await SaveTube.dl(url, 3, 'audio');  // MP3, kualitas 128kbps (3)

        // Mengirim kembali response dengan link MP4 dan MP3, dan thumbnail
        res.json({
            video: videoData.link,    // Link download MP4
            audio: audioData.link,    // Link download MP3
            title: videoData.title,   // Judul video
            thumbnail: videoData.thumbnail,  // Thumbnail video
            duration: videoData.durationLabel, // Durasi video
            description: 'Deskripsi video' // Deskripsi video
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Menyajikan file HTML statis
app.use(express.static(path.join(__dirname, '../public')));

module.exports = app;
