import express from 'express';
import User from '../models/User.js';
import Shipment from '../models/shipmentModel.js';

const router = express.Router();

router.get('/dashboard-stats', async (req, res) => {
  try {
    const registeredFarmers = await User.countDocuments({ role: 'farmer' });
    const activeBuyers = await User.countDocuments({ role: 'buyer' });
    const totalTransactions = await Shipment.countDocuments();

    // Fetch latest 10 shipments
    const recentTransactions = await Shipment.find().sort({ createdAt: -1 }).limit(10);

    res.json({
      success: true,
      stats: {
        registeredFarmers,
        activeBuyers,
        totalTransactions
      },
      recentTransactions
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

export default router;
