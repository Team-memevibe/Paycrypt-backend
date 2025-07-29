// // api/vtpass/service-variations.js (for your backend repo)
// const express = require('express');
// const router = express.Router();

// const VTPASS_BASE_URL = 'https://vtpass.com/api';

// router.get('/', async (req, res) => {
//   try {
//     const { serviceID } = req.query;

//     const apiKey = process.env.VT_API_KEY;
//     const secretKey = process.env.VT_SECRET_KEY;

//     if (!apiKey || !secretKey) {
//       return res.status(500).json({
//         error: 'VTPass API credentials not configured'
//       });
//     }

//     if (!serviceID) {
//       return res.status(400).json({
//         error: 'serviceID is required'
//       });
//     }

//     console.log('Fetching service variations for:', serviceID);

//     const response = await fetch(`${VTPASS_BASE_URL}/service-variations?serviceID=${serviceID}`, {
//       method: 'GET',
//       headers: {
//         'api-key': apiKey,
//         'secret-key': secretKey,
//         'Content-Type': 'application/json',
//       }
//     });

//     const data = await response.json();
//     console.log('Service variations response:', data);

//     if (response.ok) {
//       return res.json({
//         success: true,
//         content: data.content || data
//       });
//     }

//     const errorMessage =
//       data.response_description ||
//       data.message ||
//       data.error ||
//       `VTPass API returned status ${response.status}`;

//     console.error('Service variations fetch failed:', errorMessage);

//     return res.status(response.status || 400).json({
//       error: errorMessage,
//       vtpassResponse: data
//     });

//   } catch (error) {
//     console.error('Service variations error:', error);
//     return res.status(500).json({
//       error: 'Internal server error',
//       details: error.message
//     });
//   }
// });

// module.exports = router;