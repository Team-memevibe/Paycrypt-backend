// lib/migrations.js
// Auto-run migrations on app startup (first request)

import Order from '@/models/order';

const BASE_CHAIN_ID = 8453;
const BASE_CHAIN_NAME = 'Base';

let migrationRan = false;

export async function runMigrationsIfNeeded() {
    // Only run once
    if (migrationRan) return;
    migrationRan = true;

    try {
        console.log('🔍 Checking for pending migrations...');

        // Cutoff date: 12/3/2025, 12:28:31 AM
        const cutoffDate = new Date('2025-12-03T00:28:31Z');

        // Check if migration is needed - orders before cutoff date without chain info
        const ordersNeedingMigration = await Order.countDocuments({
            createdAt: { $lt: cutoffDate },
            $or: [
                { chainId: { $exists: false } },
                { chainName: { $exists: false } },
                { chainId: null },
                { chainName: null }
            ]
        });

        if (ordersNeedingMigration === 0) {
            console.log('✅ No migrations needed. All orders have chain info.');
            return;
        }

        console.log(`📊 Found ${ordersNeedingMigration} orders before 12/3/2025 to migrate...`);
        console.log('🚀 Running migration: Adding chainId and chainName to existing orders...');

        // Update all orders with Base chain info (only those before cutoff date)
        const result = await Order.updateMany(
            {
                createdAt: { $lt: cutoffDate },
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

        console.log(`✅ Migration completed!`);
        console.log(`   📈 Matched: ${result.matchedCount} orders`);
        console.log(`   📝 Modified: ${result.modifiedCount} orders`);

        // Verify the migration
        const verifyOrders = await Order.countDocuments({
            createdAt: { $lt: cutoffDate },
            chainId: BASE_CHAIN_ID,
            chainName: BASE_CHAIN_NAME
        });

        console.log(`✅ Verification: ${verifyOrders} orders now have Base chain info`);

    } catch (error) {
        console.error('❌ Migration error:', error.message);
        // Don't throw - just log the error so app can continue
        console.log('⚠️  Migration failed but app will continue running');
    }
}
