// models/order.js
import mongoose from 'mongoose';

const OrderSchema = new mongoose.Schema({
    requestId: {
        type: String,
        required: true,
        unique: true, // Ensures each order has a unique ID
        index: true // Index for faster lookup
    },
    userAddress: {
        type: String,
        required: true,
        lowercase: true,
        index: true // Index for user-specific order lookup
    },
    transactionHash: {
        type: String,
        required: true,
        unique: true, // Ensures unique blockchain transaction hash
        lowercase: true,
        index: true // Index for faster lookup by transaction hash
    },
    serviceType: { // e.g., 'airtime', 'electricity', 'internet', 'tv'
        type: String,
        required: true
    },
    serviceID: { // e.g., 'mtn', 'eko-electric', 'dstv', 'mtn-data'
        type: String,
        required: true
    },
    variationCode: { // For electricity/internet/TV plans
        type: String,
        required: false // Not required for airtime
    },
    customerIdentifier: { // Phone number, meter number, smart card number
        type: String,
        required: true
    },
    amountNaira: { // Amount in NGN
        type: Number,
        required: true
    },
    cryptoUsed: { // Amount of crypto sent by user
        type: Number,
        required: true
    },
    cryptoSymbol: { // e.g., 'ETH', 'USDT', 'USDC'
        type: String,
        required: true
    },
    chainId: { // 8453 (Base), 1135 (Lisk), 42220 (Celo)
        type: Number,
        required: true,
        index: true
    },
    chainName: { // 'Base', 'Lisk', 'Celo'
        type: String,
        required: true,
        index: true
    },
    onChainStatus: { // 'pending', 'confirmed', 'failed'
        type: String,
        required: true,
        default: 'pending'
    },
    vtpassStatus: { // 'pending', 'successful', 'failed', 'refunded'
        type: String,
        required: true,
        default: 'pending'
    },
    vtpassResponse: { // Raw response from VTpass API
        type: mongoose.Schema.Types.Mixed,
        required: false
    },
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    // Electricity-specific fields
    prepaid_token: String,
    units: String,
    kct1: String,
    kct2: String,
    tariff: String,
    meter_type: String, // prepaid/postpaid
    customer_name: String,
    customer_address: String,
    account_number: String,
    meter_number: String,
    transaction_date: Date,
    purchased_code: String,
});

// Update 'updatedAt' field on save
OrderSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Ensure the model is only compiled once
const Order = mongoose.models.Order || mongoose.model('Order', OrderSchema);

export default Order;
