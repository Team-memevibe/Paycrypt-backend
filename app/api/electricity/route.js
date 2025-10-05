// app/api/electricity/route.js
import { NextResponse } from 'next/server';
import { createOrder, updateOrder, findOrderByRequestId } from '@/lib/order-service';
import { purchaseService } from '@/lib/vtpassService';
import { errorHandler } from '@/utils/errorHandler'; // Import the error handler
import { corsHandler, handlePreflight } from '@/lib/cors';

// Handle OPTIONS requests (preflight)
export async function OPTIONS(req) {
    return handlePreflight(req);
}

export async function POST(req) {
    try {
        const {
            requestId,
            meter_number,
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
        if (!requestId || !meter_number || !serviceID || !variation_code || !amount || !phone || !cryptoUsed || !cryptoSymbol || !transactionHash || !userAddress) {
            const error = new Error('Missing required fields in request body.');
            error.statusCode = 400;
            error.requestId = requestId;
            throw error;
        }

        const amountNaira = Number(amount);
        if (isNaN(amountNaira) || amountNaira <= 0) {
            const error = new Error('Invalid amount provided.');
            error.statusCode = 400;
            error.requestId = requestId;
            throw error;
        }

        // Check if order already exists (idempotency check)
        const existingOrder = await findOrderByRequestId(requestId);
        if (existingOrder) {
            if (existingOrder.vtpassStatus === 'successful' && existingOrder.onChainStatus === 'confirmed') {
                console.log(`[Electricity API] Existing order ${requestId} found and already successful.`);
                return new Response(JSON.stringify({
                    message: 'Order already processed successfully',
                    order: existingOrder,
                    status: 'success'
                }), { 
                    status: 200,
                    headers: {
                        'Content-Type': 'application/json',
                        ...Object.fromEntries(corsHandler(req))
                    }
                });
            }
            const error = new Error('Order with this Request ID already exists. Current status: ' + existingOrder.vtpassStatus);
            error.statusCode = 409;
            error.requestId = requestId;
            throw error;
        }

        // 2. Create initial order record in DB with pending status
        const orderData = {
            requestId,
            userAddress,
            transactionHash,
            serviceType: 'electricity',
            serviceID,
            variationCode: variation_code,
            customerIdentifier: meter_number,
            amountNaira,
            cryptoUsed,
            cryptoSymbol,
            onChainStatus: 'confirmed',
            vtpassStatus: 'pending'
        };
        const newOrder = await createOrder(orderData);
        console.log(`[Electricity API] Initial order ${requestId} created in DB.`);

        // 3. Call VTpass API to purchase electricity
        const vtpassParams = {
            request_id: requestId,
            serviceID: serviceID,
            billersCode: meter_number,
            variation_code: variation_code,
            amount: amountNaira,
            phone: phone
        };

        console.log(`[Electricity API] Calling VTpass purchaseService for requestId: ${requestId} with params:`, vtpassParams);
        let vtpassResponse;
        try {
            vtpassResponse = await purchaseService(vtpassParams);
            console.log(`[Electricity API] VTpass raw response for ${requestId}:`, JSON.stringify(vtpassResponse));
        } catch (vtpassError) {
            console.error(`[Electricity API] Error calling purchaseService for ${requestId}:`, vtpassError);
            await updateOrder(requestId, {
                vtpassStatus: 'failed_api_call',
                vtpassResponse: { message: `VTpass API call failed: ${vtpassError.message || 'Unknown error'}` }
            });
            const error = new Error(`Failed to communicate with VTpass for electricity purchase. Request ID: ${requestId}`);
            error.statusCode = 500;
            error.requestId = requestId;
            throw error;
        }

        // 4. Update order status based on VTpass response
        if (vtpassResponse && vtpassResponse.success !== undefined) {
            if (vtpassResponse.success) {
                const vtpassData = vtpassResponse.data;
                
                // Prepare electricity-specific update data
                const updateData = {
                    vtpassStatus: 'successful',
                    vtpassResponse: vtpassData,
                    transaction_date: vtpassData.transaction_date ? new Date(vtpassData.transaction_date) : new Date(),
                    purchased_code: vtpassData.purchased_code,
                    meter_type: variation_code // prepaid/postpaid
                };
                
                // Add electricity-specific fields if available
                if (vtpassData.token) {
                    updateData.prepaid_token = vtpassData.token;
                }
                if (vtpassData.units) {
                    updateData.units = vtpassData.units;
                }
                if (vtpassData.kct1) {
                    updateData.kct1 = vtpassData.kct1;
                }
                if (vtpassData.kct2) {
                    updateData.kct2 = vtpassData.kct2;
                }
                
                await updateOrder(requestId, updateData);
                
                console.log(`[Electricity API] Order ${requestId} successfully processed by VTpass.`);
                return new Response(JSON.stringify({
                    message: 'Electricity bill paid successfully!',
                    vtpassData: vtpassData,
                    orderId: newOrder._id,
                    status: 'success',
                    // Include useful details in response
                    details: {
                        token: vtpassData.token,
                        units: vtpassData.units,
                        amount: vtpassData.amount
                    }
                }), { 
                    status: 200,
                    headers: {
                        'Content-Type': 'application/json',
                        ...Object.fromEntries(corsHandler(req))
                    }
                });
            } else {
                await updateOrder(requestId, {
                    vtpassStatus: 'failed',
                    vtpassResponse: vtpassResponse.data || { message: vtpassResponse.error || 'VTpass reported failure without specific error.' }
                });
                console.error(`[Electricity API] VTpass reported failure for order ${requestId}:`, vtpassResponse.error || vtpassResponse.data);
                const error = new Error(vtpassResponse.error || 'Failed to pay electricity bill via VTpass.');
                error.statusCode = 500;
                error.requestId = requestId;
                throw error;
            }
        } else {
            console.error(`[Electricity API] Unexpected VTpass response structure for ${requestId}:`, vtpassResponse);
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
        // Custom error handling with CORS
        const response = errorHandler(error, 'Electricity API Route');
        
        // Add CORS headers to error response
        const responseData = await response.json();
        return new Response(JSON.stringify(responseData), {
            status: response.status,
            headers: {
                'Content-Type': 'application/json',
                ...Object.fromEntries(corsHandler(req))
            }
        });
    }
}