// lib/cors.js - Create this file for dynamic CORS handling

export function corsHandler(req, res) {
  const allowedOrigins = [
    'https://paycryptv1.vercel.app',
    'https://admin-paycrypt.vercel.app',
    'http://localhost:3000',
    'http://localhost:3001'
  ];

  const origin = req.headers.origin;
  
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,DELETE,PATCH,POST,PUT,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return true; // Indicates preflight was handled
  }
  
  return false; // Continue with normal request handling
}

