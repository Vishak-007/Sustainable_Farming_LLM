import express from "express";
import { getMandiPrices } from "../services/marketPriceService.js";
import { predictCropPrice } from "../services/predictionService.js";

const router = express.Router();

router.get("/", async (req, res) => {

    const data = await getMandiPrices();

    res.json(data);

});

router.get("/predict/:crop", async (req, res) => {
    try {
        const result = await predictCropPrice(req.params.crop);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;