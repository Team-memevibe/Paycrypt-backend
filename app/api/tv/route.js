// app/api/tv/route.js
import { NextResponse } from 'next/server';
import { createOrder, updateOrder, findOrderByRequestId } from '@/lib/order-service';
import { purchaseService } from '@/lib/vtpassService';
import { errorHandler } from '@/utils/errorHandler'; // Import the error handler

export async function POST(req) {
    try {
        const {
            requestId,
            billersCode,
            serviceID,
            variation_code,
            amount,
            phone,
            cryptoUsed,
            cryptoSymbol,
            transactionHash,
            userAddress
        } = await req.json();

        // 1. Validate incoming data
        if (!requestId || !billersCode || !serviceID || !variation_code || !amount || !phone || !cryptoUsed || !cryptoSymbol || !transactionHash || !userAddress) {
            const error = new Error('Missing required fields');
            error.requestId = requestId;
            throw error;
        }

        const amountNaira = Number(amount);
        if (isNaN(amountNaira) || amountNaira <= 0) {
            const error = new Error('Invalid amount');
            error.requestId = requestId;
            throw error;
        }

        // Check if order already exists (idempotency check)
        const existingOrder = await findOrderByRequestId(requestId);
        if (existingOrder) {
            if (existingOrder.vtpassStatus === 'successful' && existingOrder.onChainStatus === 'confirmed') {
                return NextResponse.json({
                    message: 'Order already processed successfully',
                    order: existingOrder,
                    status: 'success'
                }, { status: 200 });
            }
            const error = new Error('Order with this Request ID already exists. Current status: ' + existingOrder.vtpassStatus);
            error.requestId = requestId;
            throw error;
        }

        // 2. Create initial order record in DB with pending status
        const orderData = {
            requestId,
            userAddress,
            transactionHash,
            serviceType: 'tv',
            serviceID,
            variationCode: variation_code,
            customerIdentifier: billersCode,
            amountNaira,
            cryptoUsed,
            cryptoSymbol,
            onChainStatus: 'confirmed',
            vtpassStatus: 'pending'
        };
        const newOrder = await createOrder(orderData);

        // 3. Call VTpass API to purchase TV subscription
        const vtpassParams = {
            request_id: requestId,
            serviceID: serviceID,
            billersCode: billersCode,
            variation_code: variation_code,
            amount: amountNaira,
            phone: phone
        };

        const vtpassResponse = await purchaseService(vtpassParams);

        // 4. Update order status based on VTpass response
        if (vtpassResponse.success) {
            await updateOrder(requestId, {
                vtpassStatus: 'successful',
                vtpassResponse: vtpassResponse.data
            });
            return NextResponse.json({
                message: 'TV subscription paid successfully!',
                vtpassData: vtpassResponse.data,
                orderId: newOrder._id,
                status: 'success'
            }, { status: 200 });
        } else {
            await updateOrder(requestId, {
                vtpassStatus: 'failed',
                vtpassResponse: vtpassResponse.data || { message: vtpassResponse.error }
            });
            const error = new Error(vtpassResponse.error || 'Failed to pay TV subscription via VTpass.');
            error.requestId = requestId;
            throw error;
        }

    } catch (error) {
        return errorHandler(error, 'TV API Route');
    }
}
