// config/index.js

import dotenv from "dotenv";
dotenv.config();

// TODO: Add validation to ensure required environment variables are set

const config = {
  mongoURI: process.env.MONGO_URI,
  vtpassApiKey: process.env.VTPASS_API_KEY,
  vtpassSecretKey: process.env.VTPASS_SECRET_KEY,
  smartContractAddress: process.env.SMART_CONTRACT_ADDRESS,
  // TODO: Add other smart contract related config (e.g., ABI path, private key env var name)
  privateKeyEnvVar: process.env.PRIVATE_KEY_ENV_VAR_NAME, // Example: name of the env var holding the private key
};

export default config;