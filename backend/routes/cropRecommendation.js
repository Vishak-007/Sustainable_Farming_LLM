import express from 'express';

const router = express.Router();

const cropsData = [
  { "crop": "rice", "suitable_soil": ["Clay", "Alluvial", "Loamy"], "water_requirement": "High", "water_sources_supported": ["Rainfed", "Canal", "Borewell", "Drip Irrigation"], "season": ["Kharif", "Rabi"], "previous_crop_avoid": ["rice"], "profit_level": "Medium", "risk_level": "Low", "duration_days": [90, 150] },
  { "crop": "wheat", "suitable_soil": ["Alluvial", "Loamy", "Clay"], "water_requirement": "Medium", "water_sources_supported": ["Rainfed", "Canal", "Borewell"], "season": ["Rabi"], "previous_crop_avoid": ["wheat"], "profit_level": "Medium", "risk_level": "Low", "duration_days": [110, 140] },
  { "crop": "maize", "suitable_soil": ["Alluvial", "Red"], "water_requirement": "Medium", "water_sources_supported": ["Rainfed", "Canal", "Borewell", "Drip Irrigation"], "season": ["Kharif", "Rabi"], "previous_crop_avoid": ["maize"], "profit_level": "High", "risk_level": "Medium", "duration_days": [90, 120] },
  { "crop": "sorghum", "suitable_soil": ["Black", "Red"], "water_requirement": "Low", "water_sources_supported": ["Rainfed", "Borewell"], "season": ["Kharif", "Rabi"], "previous_crop_avoid": ["sorghum"], "profit_level": "Medium", "risk_level": "Low", "duration_days": [100, 120] },
  { "crop": "bengal gram", "suitable_soil": ["Black", "Alluvial"], "water_requirement": "Low", "water_sources_supported": ["Rainfed"], "season": ["Rabi"], "previous_crop_avoid": ["bengal gram"], "profit_level": "High", "risk_level": "Low", "duration_days": [100, 120] },
  { "crop": "black gram", "suitable_soil": ["Black", "Red"], "water_requirement": "Low", "water_sources_supported": ["Rainfed", "Borewell"], "season": ["Kharif", "Rabi"], "previous_crop_avoid": ["black gram"], "profit_level": "High", "risk_level": "Low", "duration_days": [70, 90] },
  { "crop": "green gram", "suitable_soil": ["Red", "Alluvial"], "water_requirement": "Low", "water_sources_supported": ["Rainfed"], "season": ["Kharif", "Summer"], "previous_crop_avoid": ["green gram"], "profit_level": "Medium", "risk_level": "Low", "duration_days": [60, 80] },
  { "crop": "cowpea", "suitable_soil": ["Red", "Sandy"], "water_requirement": "Low", "water_sources_supported": ["Rainfed"], "season": ["Kharif", "Summer"], "previous_crop_avoid": ["cowpea"], "profit_level": "Medium", "risk_level": "Low", "duration_days": [60, 90] },
  { "crop": "soybean", "suitable_soil": ["Black", "Alluvial"], "water_requirement": "Medium", "water_sources_supported": ["Rainfed", "Canal"], "season": ["Kharif"], "previous_crop_avoid": ["soybean"], "profit_level": "High", "risk_level": "Medium", "duration_days": [90, 110] },
  { "crop": "groundnut", "suitable_soil": ["Sandy", "Red"], "water_requirement": "Low", "water_sources_supported": ["Rainfed", "Borewell"], "season": ["Kharif", "Rabi"], "previous_crop_avoid": ["groundnut"], "profit_level": "Very High", "risk_level": "Medium", "duration_days": [100, 120] },
  { "crop": "sunflower", "suitable_soil": ["Alluvial", "Black"], "water_requirement": "Medium", "water_sources_supported": ["Rainfed", "Canal", "Borewell"], "season": ["Kharif", "Rabi"], "previous_crop_avoid": ["sunflower"], "profit_level": "High", "risk_level": "Medium", "duration_days": [90, 110] },
  { "crop": "oil palm", "suitable_soil": ["Alluvial", "Laterite"], "water_requirement": "High", "water_sources_supported": ["Canal", "Borewell", "Drip Irrigation"], "season": ["Perennial"], "previous_crop_avoid": [], "profit_level": "Very High", "risk_level": "High", "duration_days": [3650, 9125] },
  { "crop": "cumbu napier hybrid", "suitable_soil": ["Alluvial", "Red"], "water_requirement": "Medium", "water_sources_supported": ["Canal", "Borewell"], "season": ["Perennial"], "previous_crop_avoid": [], "profit_level": "High", "risk_level": "Low", "duration_days": [365, 1095] },
  { "crop": "guinea grass", "suitable_soil": ["Alluvial", "Laterite"], "water_requirement": "Medium", "water_sources_supported": ["Canal", "Borewell"], "season": ["Perennial"], "previous_crop_avoid": [], "profit_level": "Medium", "risk_level": "Low", "duration_days": [365, 1095] },
  { "crop": "fodder maize", "suitable_soil": ["Alluvial", "Red"], "water_requirement": "Medium", "water_sources_supported": ["Rainfed", "Canal", "Borewell"], "season": ["Kharif", "Rabi"], "previous_crop_avoid": ["maize"], "profit_level": "High", "risk_level": "Low", "duration_days": [60, 80] }
];

const profitScores = { "Very High": 3, "High": 2, "Medium": 1, "Low": 0 };

router.post('/recommend', (req, res) => {
  const { soilType, waterSource, season } = req.body;

  if (!soilType || !waterSource || !season) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  // Helper to normalize input for matching
  const norm = (s) => (s || '').toLowerCase().replace(' soil', '').trim();

  const userSoil = norm(soilType);
  const userWater = norm(waterSource);
  const userSeason = norm(season);

  // Score each crop
  let scoredCrops = cropsData.map(crop => {
    let score = 0;
    
    const cropSoils = crop.suitable_soil.map(norm);
    const cropWaters = crop.water_sources_supported.map(norm);
    const cropSeasons = crop.season.map(norm);

    const matchSoil = cropSoils.some(s => userSoil.includes(s) || s.includes(userSoil));
    const matchWater = cropWaters.some(w => userWater === w || userWater.includes(w) || w.includes(userWater));
    const matchSeason = cropSeasons.includes(userSeason);

    if (matchSoil) score += 3;
    if (matchWater) score += 2;
    if (matchSeason) score += 3;

    // Is Exact Match?
    const isExact = (matchSoil && matchWater && matchSeason);
    
    // Add tie breakers based on profit
    score += (profitScores[crop.profit_level] || 0) * 0.1;

    return { ...crop, score, isExact };
  });

  // Sort descending by score
  scoredCrops.sort((a, b) => b.score - a.score);

  // Find exact matches first
  const exactMatches = scoredCrops.filter(c => c.isExact);

  let recommendation = null;
  let isRelaxed = false;

  if (exactMatches.length > 0) {
    // If multiple exact matches, default sorting gives highest profit first
    recommendation = exactMatches[0];
  } else {
    // If no exact match, fallback to the highest scored overall
    recommendation = scoredCrops[0];
    isRelaxed = true;
  }

  if (!recommendation) {
    return res.status(404).json({ message: "No suitable crop found." });
  }

  res.json({
    success: true,
    recommendation,
    isRelaxed,
    message: isRelaxed 
      ? "No crop exactly matched your criteria, but this is the closest recommendation." 
      : "We found an ideal crop matching all your conditions."
  });
});

export default router;
