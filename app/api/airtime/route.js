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
            const error = new Error('Missing required fields in request body.');
            error.statusCode = 400; // Bad Request
            error.requestId = requestId; // Attach requestId for logging/response
            throw error;
        }

        // Ensure amount is a number and positive
        const amountNaira = Number(amount);
        if (isNaN(amountNaira) || amountNaira <= 0) {
            const error = new Error('Invalid amount provided.');
            error.statusCode = 400; // Bad Request
            error.requestId = requestId;
            throw error;
        }

        // Check if order already exists (idempotency check)
        const existingOrder = await findOrderByRequestId(requestId);
        if (existingOrder) {
            // If the order already exists and is successful, return success
            if (existingOrder.vtpassStatus === 'successful' && existingOrder.onChainStatus === 'confirmed') {
                console.log(`[Airtime API] Existing order ${requestId} found and already successful.`);
                return NextResponse.json({
                    message: 'Order already processed successfully',
                    order: existingOrder,
                    status: 'success'
                }, { status: 200 });
            }
            // If it exists but is in a failed/pending state, you might want to retry or return a specific error
            const error = new Error('Order with this Request ID already exists. Current status: ' + existingOrder.vtpassStatus);
            error.statusCode = 409; // Conflict
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
        console.log(`[Airtime API] Initial order ${requestId} created in DB.`);

        // 3. Call VTpass API to purchase airtime
        const vtpassParams = {
            request_id: requestId, // VTpass expects request_id
            serviceID: serviceID,
            billersCode: phone, // For airtime, billersCode is the phone number
            amount: amountNaira,
            phone: phone // Phone number to receive airtime
        };

        console.log(`[Airtime API] Calling VTpass purchaseService for requestId: ${requestId} with params:`, vtpassParams);
        let vtpassResponse;
        try {
            vtpassResponse = await purchaseService(vtpassParams);
            console.log(`[Airtime API] VTpass raw response for ${requestId}:`, JSON.stringify(vtpassResponse));
        } catch (vtpassError) {
            console.error(`[Airtime API] Error calling purchaseService for ${requestId}:`, vtpassError);
            // Update order with VTpass call failure
            await updateOrder(requestId, {
                vtpassStatus: 'failed_api_call',
                vtpassResponse: { message: `VTpass API call failed: ${vtpassError.message || 'Unknown error'}` }
            });
            const error = new Error(`Failed to communicate with VTpass for airtime purchase. Request ID: ${requestId}`);
            error.statusCode = 500;
            error.requestId = requestId;
            throw error;
        }

        // 4. Update order status based on VTpass response
        // Defensive check for vtpassResponse structure
        if (vtpassResponse && vtpassResponse.success !== undefined) { // Check if 'success' property exists
            if (vtpassResponse.success) {
                await updateOrder(requestId, {
                    vtpassStatus: 'successful',
                    vtpassResponse: vtpassResponse.data
                });
                console.log(`[Airtime API] Order ${requestId} successfully processed by VTpass.`);
                return NextResponse.json({
                    message: 'Airtime purchased successfully!',
                    vtpassData: vtpassResponse.data,
                    orderId: newOrder._id,
                    status: 'success'
                }, { status: 200 });
            } else {
                await updateOrder(requestId, {
                    vtpassStatus: 'failed',
                    vtpassResponse: vtpassResponse.data || { message: vtpassResponse.error || 'VTpass reported failure without specific error.' }
                });
                console.error(`[Airtime API] VTpass reported failure for order ${requestId}:`, vtpassResponse.error || vtpassResponse.data);
                const error = new Error(vtpassResponse.error || 'Failed to purchase airtime from VTpass.');
                error.statusCode = 500; // VTpass reported an internal error
                error.requestId = requestId;
                throw error;
            }
        } else {
            // This block handles cases where vtpassResponse is not well-formed
            console.error(`[Airtime API] Unexpected VTpass response structure for ${requestId}:`, vtpassResponse);
            await updateOrder(requestId, {
                vtpassStatus: 'failed_malformed_response',
                vtpassResponse: { message: 'Malformed VTpass response', rawResponse: vtpassResponse }
            });
            const error = new Error(`VTpass returned an unreadable response. Please contact support with Request ID: ${requestId}`);
            error.statusCode = 500;
            error.requestId = requestId;
            throw error;
        }

    } catch (error) {
        // Use the centralized error handler
        return errorHandler(error, 'Airtime API Route');
    }
}
