// app/api/airtime/route.js
import { NextResponse } from 'next/server';
import { createOrder, updateOrder, findOrderByRequestId } from '@/lib/order-service';
import { purchaseService } from '@/lib/vtpassService';
import { errorHandler } from '@/utils/errorHandler'; // Import the error handler

export async function POST(req) {
    try {
        const {
            requestId,
            phone,
            serviceID,
            amount, // Amount in NGN
            cryptoUsed,
            cryptoSymbol,
            transactionHash,
            userAddress // Assuming userAddress is sent from frontend after wallet connection
        } = await req.json();

        // 1. Validate incoming data
        if (!requestId || !phone || !serviceID || !amount || !cryptoUsed || !cryptoSymbol || !transactionHash || !userAddress) {
            const error = new Error('Missing required fields');
            error.requestId = requestId; // Attach requestId for logging/response
            throw error;
        }

        // Ensure amount is a number and positive
        const amountNaira = Number(amount);
        if (isNaN(amountNaira) || amountNaira <= 0) {
            const error = new Error('Invalid amount');
            error.requestId = requestId;
            throw error;
        }

        // Check if order already exists (idempotency check)
        const existingOrder = await findOrderByRequestId(requestId);
        if (existingOrder) {
            // If the order already exists and is successful, return success
            if (existingOrder.vtpassStatus === 'successful' && existingOrder.onChainStatus === 'confirmed') {
                return NextResponse.json({
                    message: 'Order already processed successfully',
                    order: existingOrder,
                    status: 'success'
                }, { status: 200 });
            }
            // If it exists but is in a failed/pending state, you might want to retry or return a specific error
            const error = new Error('Order with this Request ID already exists. Current status: ' + existingOrder.vtpassStatus);
            error.requestId = requestId;
            throw error; // Let errorHandler handle the 409 conflict
        }

        // 2. Create initial order record in DB with pending status
        const orderData = {
            requestId,
            userAddress,
            transactionHash,
            serviceType: 'airtime',
            serviceID,
            customerIdentifier: phone, // For airtime, phone is the identifier
            amountNaira,
            cryptoUsed,
            cryptoSymbol,
            onChainStatus: 'confirmed', // Assuming frontend confirms on-chain tx before calling backend
            vtpassStatus: 'pending' // VTpass processing starts as pending
        };
        const newOrder = await createOrder(orderData);

        // 3. Call VTpass API to purchase airtime
        const vtpassParams = {
            request_id: requestId, // VTpass expects request_id
            serviceID: serviceID,
            billersCode: phone, // For airtime, billersCode is the phone number
            amount: amountNaira,
            phone: phone // Phone number to receive airtime
        };

        const vtpassResponse = await purchaseService(vtpassParams);

        // 4. Update order status based on VTpass response
        if (vtpassResponse.success) {
            await updateOrder(requestId, {
                vtpassStatus: 'successful',
                vtpassResponse: vtpassResponse.data
            });
            return NextResponse.json({
                message: 'Airtime purchased successfully!',
                vtpassData: vtpassResponse.data,
                orderId: newOrder._id,
                status: 'success'
            }, { status: 200 });
        } else {
            await updateOrder(requestId, {
                vtpassStatus: 'failed',
                vtpassResponse: vtpassResponse.data || { message: vtpassResponse.error }
            });
            const error = new Error(vtpassResponse.error || 'Failed to purchase airtime from VTpass.');
            error.requestId = requestId;
            throw error; // Let errorHandler handle the 500 internal server error
        }

    } catch (error) {
        // Use the centralized error handler
        return errorHandler(error, 'Airtime API Route');
    }
}
