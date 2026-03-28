import express from 'express';
import Farmer from '../models/Farmer.js';

const router = express.Router();

// @route   POST /api/farmers/register
// @desc    Register a farmer (for newsignin.html)
router.post('/register', async (req, res) => {
  try {
    const { mobile } = req.body;
    let farmer = await Farmer.findOne({ mobile });
    if (farmer) {
      return res.status(400).json({ message: 'Farmer already exists with this mobile' });
    }

    farmer = new Farmer(req.body);
    await farmer.save();
    res.status(201).json({ message: 'Farmer registered successfully', farmer });
  } catch (err) {
    console.error('Registration Error:', err.message);
    res.status(500).json({ message: 'Server error during registration', error: err.message });
  }
});

// @route   POST /api/farmers/login
// @desc    Login farmer (for signin.html)
router.post('/login', async (req, res) => {
  try {
    const { firstName, lastName, mobile } = req.body;
    const farmer = await Farmer.findOne({ firstName, lastName, mobile });
    
    if (!farmer) {
      return res.status(400).json({ message: 'Invalid credentials. User not found.' });
    }
    
    res.json({ message: 'Login successful', farmer });
  } catch (err) {
    console.error('Login Error:', err.message);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// @route   GET /api/farmers/:mobile
// @desc    Get farmer profile and mocked advisory data (for maindashboard.html loadAll API)
router.get('/:mobile', async (req, res) => {
  try {
    const { mobile } = req.params;
    const farmer = await Farmer.findOne({ mobile });
    
    if (!farmer) {
      return res.status(404).json({ message: 'Farmer not found' });
    }
    
    // Calculate simple mocked ROI
    const invest = farmer.previousInvestment || 1;
    const profit = farmer.previousProfit || 0;
    const roi = (((profit - invest) / invest) * 100).toFixed(1);

    const advisory = {
      roi: roi > -100 ? roi : "12",
      season: 'rabi',
      advice: [
        {type:'fertilizer', icon:'🌿', title:'Fertilizer Recommendation', body:'Apply NPK 20-10-10 at transplanting. Top-dress with Urea at tillering stage.'},
        {type:'irrigation', icon:'💧', title:'Irrigation Advice', body:'Use drip or sprinkler irrigation to save water. Monitor water table levels regularly.'},
        {type:'soil', icon:'🌱', title:'Soil Management', body:'Your soil retains moisture well. Avoid waterlogging. Add lime if pH < 6.'},
        {type:'season', icon:'📅', title:'Seasonal Advisory', body:'Rabi season (Nov–Apr): Ideal time for wheat, mustard, chickpea, barley. Irrigate at critical stages.'},
        {type:'livestock', icon:'🐄', title:'Livestock Integration', body:'Use animal waste as organic manure — reduces fertilizer costs by 30–40%.'},
        {type:'finance', icon:'💰', title:'Financial Health', body:'Your ROI is '+roi+'%. Consider reinvesting in better irrigation equipment or expanding land area.'},
      ],
      alerts:[
        {level:'info', icon:'ℹ️', msg:'PM-KISAN enrolled — next installment due in March.'},
        {level:'success', icon:'✅', msg:`Your ${farmer.regularCrop || 'crop'} is progressing well!`},
        {level:'warn', icon:'⚠️', msg:'Heavy rain expected in 2 days — avoid pesticide spraying.'},
      ]
    };
    
    // Simulate what the frontend expects: { farmer, advisory }
    res.json({ farmer, advisory });
  } catch (err) {
    console.error('Get Farmer Error:', err.message);
    res.status(500).json({ message: 'Server error fetching farmer' });
  }
});

export default router;
