import { NextResponse } from 'next/server';
import { corsHandler, handlePreflight } from '@/lib/cors';

const VTPASS_BASE_URL = 'https://vtpass.com/api';

// Handle OPTIONS requests (preflight)
export async function OPTIONS(req) {
  return handlePreflight(req);
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { serviceID, billersCode, type } = body;

    const apiKey = process.env.VT_API_KEY;
    const secretKey = process.env.VT_SECRET_KEY;

    if (!apiKey || !secretKey) {
      return new Response(JSON.stringify({
        error: 'VTPass API credentials not configured'
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...Object.fromEntries(corsHandler(request))
        }
      });
    }

    if (!serviceID || !billersCode) {
      return new Response(JSON.stringify({
        error: 'serviceID and billersCode required'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...Object.fromEntries(corsHandler(request))
        }
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
      return new Response(JSON.stringify({
        success: true,
        data: data.content,
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...Object.fromEntries(corsHandler(request))
        }
      });
    }

    // Handle IP whitelisting error specifically
    if (data.errors && typeof data.errors === 'string' && data.errors.includes('IP NOT WHITELISTED')) {
      console.error('IP not whitelisted error:', data.errors);
      return new Response(JSON.stringify({
        error: 'IP address not whitelisted. Please contact VTPass support to whitelist your server IP.',
        vtpassResponse: data,
        needsWhitelisting: true
      }), {
        status: 403,
        headers: {
          'Content-Type': 'application/json',
          ...Object.fromEntries(corsHandler(request))
        }
      });
    }

    const errorMessage =
      data.response_description ||
      data.message ||
      data.error ||
      data.errors ||
      `VTPass API returned status ${response.status}`;

    console.error('VTPass verification failed:', errorMessage);

    return new Response(JSON.stringify({
      error: errorMessage, 
      vtpassResponse: data
    }), {
      status: response.status || 400,
      headers: {
        'Content-Type': 'application/json',
        ...Object.fromEntries(corsHandler(request))
      }
    });

  } catch (error) {
    console.error('Verify error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...Object.fromEntries(corsHandler(request))
      }
    });
  }
}