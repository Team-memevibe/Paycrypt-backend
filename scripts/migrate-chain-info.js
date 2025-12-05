// scripts/migrate-chain-info.js
// Migration script to add chainId and chainName to all existing orders

import mongoose from 'mongoose';
import Order from '../models/order.js';
import dotenv from 'dotenv';

dotenv.config();

const migrateChainInfo = async () => {
    try {
        console.log('🚀 Starting migration: Adding chainId and chainName to existing orders...');

        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Base chain defaults for all existing transactions
        const BASE_CHAIN_ID = 8453;
        const BASE_CHAIN_NAME = 'Base';

        // Find all orders without chainId or chainName
        const ordersToUpdate = await Order.find({
            $or: [
                { chainId: { $exists: false } },
                { chainName: { $exists: false } },
                { chainId: null },
                { chainName: null }
            ]
        });

        console.log(`📊 Found ${ordersToUpdate.length} orders to migrate`);

        if (ordersToUpdate.length === 0) {
            console.log('✅ No orders to migrate. All orders already have chainId and chainName.');
            await mongoose.connection.close();
            return;
        }

        // Update all orders with Base chain info
        const result = await Order.updateMany(
            {
                $or: [
                    { chainId: { $exists: false } },
                    { chainName: { $exists: false } },
                    { chainId: null },
                    { chainName: null }
                ]
            },
            {
                $set: {
                    chainId: BASE_CHAIN_ID,
                    chainName: BASE_CHAIN_NAME
                }
            }
        );

        console.log(`✅ Migration completed successfully!`);
        console.log(`   - Matched: ${result.matchedCount} orders`);
        console.log(`   - Modified: ${result.modifiedCount} orders`);

        // Verify the migration
        const verifyOrders = await Order.countDocuments({
            chainId: { $exists: true },
            chainName: { $exists: true },
            chainId: BASE_CHAIN_ID,
            chainName: BASE_CHAIN_NAME
        });

        console.log(`✅ Verification: ${verifyOrders} orders now have Base chain info`);

        console.log('\n✅ Migration completed successfully!');
        console.log('📌 MongoDB connection is still active and running...');
        console.log('⏳ Press Ctrl+C to close the connection when ready.\n');
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    }
};

migrateChainInfo();
