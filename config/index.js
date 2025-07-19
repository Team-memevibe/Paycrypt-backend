    // config/index.js

    // Ensure environment variables are loaded (for local development)
    // In Next.js, these are automatically loaded for API routes and build process.
    // However, if you're running standalone scripts, you might need dotenv.
    // require('dotenv').config(); // Uncomment if running standalone Node.js scripts

    const config = {
        mongodbUri: process.env.MONGODB_URI,
        vtpass: {
            apiKey: process.env.VTPASS_API_KEY,
            secretKey: process.env.VTPASS_SECRET_KEY,
            baseUrl: process.env.NODE_ENV === 'production' ? "https://vtpass.com/api" : "https://sandbox.vtpass.com/api"
        },
        // Add other global configurations here
        // For example, smart contract addresses or other API keys
        contractAddress: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS, // Assuming this is public
        // You might have separate config for public vs private env vars
    };

    // Basic validation (optional but recommended)
    if (!config.mongodbUri) {
        console.error("CRITICAL ERROR: MONGODB_URI is not defined in environment variables.");
        // In a real app, you might want to throw an error or exit here for critical configs
    }
    if (!config.vtpass.apiKey || !config.vtpass.secretKey) {
        console.warn("WARNING: VTPASS_API_KEY or VTPASS_SECRET_KEY are not defined. VTpass services may not function.");
    }

    export default config;
    // This config can be imported in your Next.js API routes or other parts of the application
    // Example usage in an API route: