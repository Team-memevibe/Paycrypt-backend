// lib/vtpassService.js
import config from '../config'; // Import the centralized config

const VTPASS_API_KEY = config.vtpass.apiKey;
const VTPASS_SECRET_KEY = config.vtpass.secretKey;
const VTPASS_BASE_URL = config.vtpass.baseUrl;

if (!VTPASS_API_KEY || !VTPASS_SECRET_KEY) {
    console.warn("VTpass API_KEY or SECRET_KEY not set in config. VTpass functionality may be limited.");
}

/**
 * Makes a purchase request to the VTpass API.
 * @param {object} params - Parameters for the purchase.
 * @param {string} params.requestId - Unique request ID from your system.
 * @param {string} params.serviceID - VTpass service ID (e.g., 'mtn', 'dstv').
 * @param {string} params.billersCode - Customer identifier (phone, meter, smartcard).
 * @param {string} params.variation_code - Plan code (e.g., 'prepaid', 'postpaid', specific data plan).
 * @param {number} params.amount - Amount in Naira.
 * @param {string} params.phone - Customer's phone number (for airtime/data token delivery).
 * @returns {Promise<object>} The response from the VTpass API.
 */
export async function purchaseService(params) {
    if (!VTPASS_API_KEY || !VTPASS_SECRET_KEY) {
        throw new Error("VTpass API keys are not configured in config/index.js.");
    }

    const authString = Buffer.from(`${VTPASS_API_KEY}:${VTPASS_SECRET_KEY}`).toString('base64');

    try {
        const response = await fetch(`${VTPASS_BASE_URL}/pay`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${authString}`
            },
            body: JSON.stringify(params)
        });

        const data = await response.json();
        console.log('VTpass purchase response:', data);

        if (data.code === '000') { // VTpass success code
            return { success: true, data: data };
        } else {
            // VTpass API returned an error or non-success code
            return { success: false, error: data.response_description || data.message || "VTpass purchase failed", data: data };
        }
    } catch (error) {
        console.error('Error calling VTpass purchase API:', error);
        return { success: false, error: `Network or unexpected error: ${error.message}` };
    }
}

/**
 * Verifies a customer identifier (meter number, smart card number).
 * @param {object} params - Parameters for verification.
 * @param {string} params.serviceID - VTpass service ID.
 * @param {string} params.billersCode - The customer's meter/smartcard number.
 * @param {string} params.type - Type of verification ('smartcard', 'meter').
 * @returns {Promise<object>} The response from the VTpass API.
 */
export async function verifyCustomer(params) {
    if (!VTPASS_API_KEY || !VTPASS_SECRET_KEY) {
        throw new Error("VTpass API keys are not configured in config/index.js.");
    }

    const authString = Buffer.from(`${VTPASS_API_KEY}:${VTPASS_SECRET_KEY}`).toString('base64');

    try {
        const response = await fetch(`${VTPASS_BASE_URL}/merchant-verify`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${authString}`
            },
            body: JSON.stringify(params)
        });

        const data = await response.json();
        console.log('VTpass verification response:', data);

        if (data.code === '000') { // VTpass success code for verification
            return { success: true, data: data.content };
        } else {
            return { success: false, error: data.response_description || data.message || "VTpass verification failed", data: data };
        }
    } catch (error) {
        console.error('Error calling VTpass verification API:', error);
        return { success: false, error: `Network or unexpected error: ${error.message}` };
    }
}


/**
 * Fetches service variations (plans) for a given service ID.
 * @param {string} serviceID - The VTpass service ID.
 * @returns {Promise<object>} The response from the VTpass API.
 */
export async function getServiceVariations(serviceID) {
    if (!VTPASS_API_KEY || !VTPASS_SECRET_KEY) {
        throw new Error("VTpass API keys are not configured in config/index.js.");
    }

    const authString = Buffer.from(`${VTPASS_API_KEY}:${VTPASS_SECRET_KEY}`).toString('base64');

    try {
        const response = await fetch(`${VTPASS_BASE_URL}/service-variations?serviceID=${serviceID}`, {
            method: 'GET',
            headers: {
                'Authorization': `Basic ${authString}`
            }
        });

        const data = await response.json();
        console.log(`VTpass service variations for ${serviceID}:`, data);

        if (data.code === '000') {
            return { success: true, content: data.content };
        } else {
            return { success: false, error: data.response_description || data.message || "Failed to fetch service variations", data: data };
        }
    } catch (error) {
        console.error('Error fetching service variations from VTpass API:', error);
        return { success: false, error: `Network or unexpected error: ${error.message}` };
    }
}

/**
 * Fetches all services based on an identifier (e.g., 'data', 'tv-subscription').
 * @param {string} identifier - The identifier for the service type.
 * @returns {Promise<object>} The response from the VTpass API.
 */
export async function getServices(identifier) {
    if (!VTPASS_API_KEY || !VTPASS_SECRET_KEY) {
        throw new Error("VTpass API keys are not configured in config/index.js.");
    }

    const authString = Buffer.from(`${VTPASS_API_KEY}:${VTPASS_SECRET_KEY}`).toString('base64');

    try {
        const response = await fetch(`${VTPASS_BASE_URL}/services?identifier=${identifier}`, {
            method: 'GET',
            headers: {
                'Authorization': `Basic ${authString}`
            }
        });

        const data = await response.json();
        console.log(`VTpass services for ${identifier}:`, data);

        if (response.ok) { // VTpass API returns 200 even for no content
            return { success: true, content: data.content };
        } else {
            return { success: false, error: data.response_description || data.message || "Failed to fetch services", data: data };
        }
    } catch (error) {
        console.error('Error fetching services from VTpass API:', error);
        return { success: false, error: `Network or unexpected error: ${error.message}` };
    }
}
