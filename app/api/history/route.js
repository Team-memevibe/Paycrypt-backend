// hitory/route.js
const express = require('express');
const router = express.Router();
const Order = require('../models/order'); // Adjust path if needed

/**
 * GET /api/history?userAddress=0x123...
 */
router.get('/', async (req, res) => {
  const { userAddress } = req.query;

  if (!userAddress) {
    return res.status(400).json({ error: 'userAddress is required' });
  }

  try {
    const orders = await Order.find({ userAddress: String(userAddress).toLowerCase() })
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({ success: true, orders });
  } catch (err) {
    console.error('History route error:', err);
    res.status(500).json({ error: 'Failed to fetch transaction history.' });
  }
});

module.exports = router;
