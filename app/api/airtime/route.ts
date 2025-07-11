import { NextApiRequest, NextApiResponse } from 'next';
import { createOrder } from '../../../lib/order-service';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    // Parse request body for airtime purchase details
    const { phone, amount, provider, crypto, userAddress } = req.body;
    try {
        // Create order in DB (pending payment)
        const order = await createOrder({ phone, amount, provider, crypto, userAddress });
        // Respond with order details (including orderId for payment)
        res.status(201).json({ order });
    } catch (err) {
        res.status(500).json({ error: 'Failed to create order' });
    }
}