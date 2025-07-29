import { NextResponse } from 'next/server';

const VTPASS_BASE_URL = 'https://vtpass.com/api';

export async function POST(request) {
  try {
    const body = await request.json();
    const { serviceID, billersCode, type } = body;

    const apiKey = process.env.VT_API_KEY;
    const secretKey = process.env.VT_SECRET_KEY;

    if (!apiKey || !secretKey) {
      return NextResponse.json(
        { error: 'VTPass API credentials not configured' },
        { status: 500 }
      );
    }

    if (!serviceID || !billersCode) {
      return NextResponse.json(
        { error: 'serviceID and billersCode required' },
        { status: 400 }
      );
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
      return NextResponse.json({
        success: true,
        data: data.content,
      });
    }

    // Handle IP whitelisting error specifically
    if (data.errors && typeof data.errors === 'string' && data.errors.includes('IP NOT WHITELISTED')) {
      console.error('IP not whitelisted error:', data.errors);
      return NextResponse.json(
        { 
          error: 'IP address not whitelisted. Please contact VTPass support to whitelist your server IP.',
          vtpassResponse: data,
          needsWhitelisting: true
        },
        { status: 403 }
      );
    }

    const errorMessage =
      data.response_description ||
      data.message ||
      data.error ||
      data.errors ||
      `VTPass API returned status ${response.status}`;

    console.error('VTPass verification failed:', errorMessage);

    return NextResponse.json(
      { error: errorMessage, vtpassResponse: data },
      { status: response.status || 400 }
    );

  } catch (error) {
    console.error('Verify error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error.message
      },
      { status: 500 }
    );
  }
}