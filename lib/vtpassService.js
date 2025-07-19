// lib/vtpassService.js
import config from '../config'; // Import the centralized config

// Use the new environment variable names for consistency with your working repo
const VT_API_KEY = config.vtpass.apiKey;
const VT_PUBLIC_KEY = config.vtpass.publicKey; // New key for GET requests
const VT_SECRET_KEY = config.vtpass.secretKey;
const VTPASS_BASE_URL = config.vtpass.baseUrl;

if (!VT_API_KEY || !VT_SECRET_KEY || !VT_PUBLIC_KEY) {
    console.warn("VTpass API keys (VT_API_KEY, VT_PUBLIC_KEY, VT_SECRET_KEY) not fully set in config. VTpass functionality may be limited.");
}

// Helper to get common headers for VTpass
function getVtpassHeaders(type = 'post') {
    const headers = {
        'Content-Type': 'application/json',
        'api-key': VT_API_KEY,
    };

    if (type === 'get') {
        headers['public-key'] = VT_PUBLIC_KEY;
    } else { // 'post' or any other method
        headers['secret-key'] = VT_SECRET_KEY;
    }
    return headers;
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
    if (!VT_API_KEY || !VT_SECRET_KEY) {
        throw new Error("VTpass API keys (VT_API_KEY, VT_SECRET_KEY) are not configured.");
    }

    try {
        const response = await fetch(`${VTPASS_BASE_URL}/pay`, {
            method: 'POST',
            headers: getVtpassHeaders('post'), // Use custom headers for POST
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
    if (!VT_API_KEY || !VT_PUBLIC_KEY) { // Verify public key for GET-like operation
        throw new Error("VTpass API keys (VT_API_KEY, VT_PUBLIC_KEY) are not configured.");
    }

    try {
        const response = await fetch(`${VTPASS_BASE_URL}/merchant-verify`, {
            method: 'POST', // VTpass verify is also a POST, but uses public key
            headers: getVtpassHeaders('get'), // Use public key for verification
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
    if (!VT_API_KEY || !VT_PUBLIC_KEY) {
        throw new new Error("VTpass API keys (VT_API_KEY, VT_PUBLIC_KEY) are not configured.");
    }

    try {
        const response = await fetch(`${VTPASS_BASE_URL}/service-variations?serviceID=${serviceID}`, {
            method: 'GET',
            headers: getVtpassHeaders('get') // Use public key for GET
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
    if (!VT_API_KEY || !VT_PUBLIC_KEY) {
        throw new Error("VTpass API keys (VT_API_KEY, VT_PUBLIC_KEY) are not configured.");
    }

    try {
        const response = await fetch(`${VTPASS_BASE_URL}/services?identifier=${identifier}`, {
            method: 'GET',
            headers: getVtpassHeaders('get') // Use public key for GET
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
