import { OrderModel } from '../models/order';

// Create a new airtime order (pending payment)
export async function createOrder({ phone, amount, provider, crypto, userAddress }) {
    const order = await OrderModel.create({
        phone,
        amount,
        provider,
        crypto,
        userAddress,
        status: 'pending',
        createdAt: new Date(),
    });
    return order;
}