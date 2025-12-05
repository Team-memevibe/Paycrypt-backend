// app/api/internet/route.js
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
            phone, // This is customerIdentifier for internet
            serviceID,
            variation_code,
            amount,
            cryptoUsed,
            cryptoSymbol,
            transactionHash,
            userAddress,
            chainId,
            chainName
        } = await req.json();

        // 1. Validate incoming data
        if (!requestId || !phone || !serviceID || !variation_code || !amount || !cryptoUsed || !cryptoSymbol || !transactionHash || !userAddress || !chainId || !chainName) {
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
                console.log(`[Internet API] Existing order ${requestId} found and already successful.`);
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
            serviceType: 'internet',
            serviceID,
            variationCode: variation_code,
            customerIdentifier: phone, // For internet, phone is the identifier
            amountNaira,
            cryptoUsed,
            cryptoSymbol,
            chainId: Number(chainId),
            chainName,
            onChainStatus: 'confirmed',
            vtpassStatus: 'pending'
        };
        const newOrder = await createOrder(orderData);
        console.log(`[Internet API] Initial order ${requestId} created in DB.`);

        // 3. Call VTpass API to purchase internet data
        const vtpassParams = {
            request_id: requestId,
            serviceID: serviceID,
            billersCode: phone, // For internet, billersCode is the phone number
            variation_code: variation_code,
            amount: amountNaira,
            phone: phone
        };

        console.log(`[Internet API] Calling VTpass purchaseService for requestId: ${requestId} with params:`, vtpassParams);
        let vtpassResponse;
        try {
            vtpassResponse = await purchaseService(vtpassParams);
            console.log(`[Internet API] VTpass raw response for ${requestId}:`, JSON.stringify(vtpassResponse));
        } catch (vtpassError) {
            console.error(`[Internet API] Error calling purchaseService for ${requestId}:`, vtpassError);
            await updateOrder(requestId, {
                vtpassStatus: 'failed_api_call',
                vtpassResponse: { message: `VTpass API call failed: ${vtpassError.message || 'Unknown error'}` }
            });
            const error = new Error(`Failed to communicate with VTpass for internet purchase. Request ID: ${requestId}`);
            error.statusCode = 500;
            error.requestId = requestId;
            throw error;
        }

        // 4. Update order status based on VTpass response
        if (vtpassResponse && vtpassResponse.success !== undefined) {
            if (vtpassResponse.success) {
                await updateOrder(requestId, {
                    vtpassStatus: 'successful',
                    vtpassResponse: vtpassResponse.data
                });
                console.log(`[Internet API] Order ${requestId} successfully processed by VTpass.`);
                return new Response(JSON.stringify({
                    message: 'Internet data purchased successfully!',
                    vtpassData: vtpassResponse.data,
                    orderId: newOrder._id,
                    status: 'success'
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
                console.error(`[Internet API] VTpass reported failure for order ${requestId}:`, vtpassResponse.error || vtpassResponse.data);
                const error = new Error(vtpassResponse.error || 'Failed to purchase internet data via VTpass.');
                error.statusCode = 500;
                error.requestId = requestId;
                throw error;
            }
        } else {
            console.error(`[Internet API] Unexpected VTpass response structure for ${requestId}:`, vtpassResponse);
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
        const response = errorHandler(error, 'Internet API Route');
        
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