import express from "express";
import { getWeather } from "../services/weatherService.js";

const router = express.Router();

router.get("/", async (req, res) => {
    try {
        const { lat, lon } = req.query;
        if (!lat || !lon) {
            return res.status(400).json({ error: "Missing lat or lon parameters" });
        }
        
        const data = await getWeather(lat, lon);
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
