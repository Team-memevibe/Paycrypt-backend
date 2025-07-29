// api/vtpass/verify.js (for your backend repo)
const express = require('express');
const router = express.Router();

const VTPASS_BASE_URL = 'https://vtpass.com/api';

router.post('/', async (req, res) => {
  try {
    const { serviceID, billersCode, type } = req.body;

    const apiKey = process.env.VT_API_KEY;
    const secretKey = process.env.VT_SECRET_KEY;

    if (!apiKey || !secretKey) {
      return res.status(500).json({
        error: 'VTPass API credentials not configured'
      });
    }

    if (!serviceID || !billersCode) {
      return res.status(400).json({
        error: 'serviceID and billersCode required'
      });
    }

    const payload = {
      serviceID,
      billersCode,
      ...(type && { type }),
    };

    console.log('VTPass verify request:', payload);

    const response = await fetch(`${VTPASS_BASE_URL}/merchant-verify`, {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'secret-key': secretKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    console.log('VTPass verify response:', data);

    if (response.ok && data.content) {
      return res.json({
        success: true,
        data: data.content,
      });
    }

    // Handle IP whitelisting error specifically
    if (data.errors && typeof data.errors === 'string' && data.errors.includes('IP NOT WHITELISTED')) {
      console.error('IP not whitelisted error:', data.errors);
      return res.status(403).json({
        error: 'IP address not whitelisted. Please contact VTPass support to whitelist your server IP.',
        vtpassResponse: data,
        needsWhitelisting: true
      });
    }

    const errorMessage =
      data.response_description ||
      data.message ||
      data.error ||
      data.errors ||
      `VTPass API returned status ${response.status}`;

    console.error('VTPass verification failed:', errorMessage);

    return res.status(response.status || 400).json({
      error: errorMessage,
      vtpassResponse: data
    });

  } catch (error) {
    console.error('Verify error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
});

module.exports = router;