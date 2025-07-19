// lib/order-service.js
import dbConnect from '../db';
import Order from '../models/order';

/**
 * Creates a new order in the database.
 * @param {object} orderData - The data for the new order.
 * @returns {Promise<Order>} The created order document.
 */
export async function createOrder(orderData) {
    await dbConnect();
    try {
        const order = new Order(orderData);
        await order.save();
        console.log('Order created:', order.requestId);
        return order;
    } catch (error) {
        console.error('Error creating order:', error);
        throw error;
    }
}

/**
 * Finds an order by its request ID.
 * @param {string} requestId - The unique request ID of the order.
 * @returns {Promise<Order|null>} The found order document or null if not found.
 */
export async function findOrderByRequestId(requestId) {
    await dbConnect();
    try {
        const order = await Order.findOne({ requestId });
        return order;
    } catch (error) {
        console.error('Error finding order by requestId:', error);
        throw error;
    }
}

/**
 * Finds an order by its transaction hash.
 * @param {string} transactionHash - The blockchain transaction hash of the order.
 * @returns {Promise<Order|null>} The found order document or null if not found.
 */
export async function findOrderByTransactionHash(transactionHash) {
    await dbConnect();
    try {
        const order = await Order.findOne({ transactionHash });
        return order;
    } catch (error) {
        console.error('Error finding order by transactionHash:', error);
        throw error;
    }
}

/**
 * Updates an existing order's status and VTpass response.
 * @param {string} requestId - The request ID of the order to update.
 * @param {object} updates - An object containing fields to update (e.g., { vtpassStatus: 'successful', vtpassResponse: {...} }).
 * @returns {Promise<Order|null>} The updated order document or null if not found.
 */
export async function updateOrder(requestId, updates) {
    await dbConnect();
    try {
        const order = await Order.findOneAndUpdate(
            { requestId },
            { $set: { ...updates, updatedAt: Date.now() } },
            { new: true, runValidators: true } // Return the updated document and run schema validators
        );
        if (order) {
            console.log('Order updated:', order.requestId, updates);
        } else {
            console.warn('Order not found for update:', requestId);
        }
        return order;
    } catch (error) {
        console.error('Error updating order:', error);
        throw error;
    }
}

/**
 * Fetches all orders for a given user address.
 * @param {string} userAddress - The blockchain address of the user.
 * @returns {Promise<Order[]>} An array of order documents.
 */
export async function getOrdersByUser(userAddress) {
    await dbConnect();
    try {
        const orders = await Order.find({ userAddress }).sort({ createdAt: -1 }); // Sort by newest first
        return orders;
    } catch (error) {
        console.error('Error fetching orders by user:', error);
        throw error;
    }
}
