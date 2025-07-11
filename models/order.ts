import mongoose from 'mongoose';

const OrderSchema = new mongoose.Schema({
    phone: String,
    amount: Number,
    provider: String,
    crypto: String,
    userAddress: String,
    status: { type: String, default: 'pending' },
    createdAt: { type: Date, default: Date.now },
    paymentTx: String,
    airtimeTx: String,
});

export const OrderModel = mongoose.models.Order || mongoose.model('Order', OrderSchema);