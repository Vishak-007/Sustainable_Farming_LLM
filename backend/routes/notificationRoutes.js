import express from 'express';
const router = express.Router();

router.get('/farmer', (req, res) => {
  // Mocking real-time notifications for the Farmer Dashboard
  const notifications = [
    {
      id: 1,
      type: 'alert',
      title: 'Market Uptrend Warning!',
      message: 'Potato prices are surging in your district. Hold stock for larger profits.',
      date: new Date().toISOString()
    },
    {
      id: 2,
      type: 'offer',
      title: 'New Buyer Offer',
      message: 'Kisan Traders wants to buy 100kg Wheat at ₹40/kg.',
      date: new Date(Date.now() - 3600000).toISOString() // 1 hour ago
    },
    {
      id: 3,
      type: 'info',
      title: 'Weather Advisory',
      message: 'Heavy rainfall expected tomorrow. Ensure grain storage is sealed.',
      date: new Date(Date.now() - 86400000).toISOString() // 1 day ago
    }
  ];
  
  res.json({ success: true, notifications });
});

export default router;
