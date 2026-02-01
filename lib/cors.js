// lib/cors.js
export function corsHandler(req) {
  const allowedOrigins = [
    'https://paycryptv1.vercel.app',
    'https://admin-paycrypt.vercel.app',
    'https://www.paycrypt.org',
    'https://admin.paycrypt.org',
    'https://miniapp.paycrypt.org'
  ];

  const origin = req.headers.get('origin');
  
  // Create headers object
  const headers = new Headers();
  
  if (allowedOrigins.includes(origin)) {
    headers.set('Access-Control-Allow-Origin', origin);
  }
  
  headers.set('Access-Control-Allow-Credentials', 'true');
  headers.set('Access-Control-Allow-Methods', 'GET,DELETE,PATCH,POST,PUT,OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, x-api-key');

  return headers;
}

// Handle preflight OPTIONS requests
export function handlePreflight(req) {
  if (req.method === 'OPTIONS') {
    const corsHeaders = corsHandler(req);
    return new Response(null, {
      status: 200,
      headers: corsHeaders
    });
  }
  return null;
}