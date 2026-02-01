// config/index.js

const config = {
    mongodbUri: process.env.MONGODB_URI,
    vtpass: {
        apiKey: process.env.VT_API_KEY,    // Updated name
        secretKey: process.env.VT_SECRET_KEY, // Updated name
        publicKey: process.env.VT_PUBLIC_KEY, // NEW: Add public key
        baseUrl: process.env.VTPASS_BASE_URL || (process.env.NODE_ENV === 'production' ? "https://vtpass.com/api" : "https://sandbox.vtpass.com/api")
    },
    // Add other global configurations here
    contractAddress: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS,
    apiKey: process.env.PAYCRYPT_API_KEY,
};

// Basic validation (optional but recommended)
if (!config.mongodbUri) {
    console.error("CRITICAL ERROR: MONGODB_URI is not defined in environment variables.");
}
if (!config.vtpass.apiKey || !config.vtpass.secretKey || !config.vtpass.publicKey) {
    console.warn("WARNING: VTpass API keys (VT_API_KEY, VT_PUBLIC_KEY, VT_SECRET_KEY) are not fully defined. VTpass services may not function.");
}
if (!config.apiKey) {
    console.warn("WARNING: PAYCRYPT_API_KEY is not defined. All API requests will be rejected.");
}

export default config;
