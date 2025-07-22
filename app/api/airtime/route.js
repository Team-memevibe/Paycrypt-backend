// app/api/airtime/route.js - Improved version with better error handling

import { NextResponse } from 'next/server';
import { createOrder, updateOrder, findOrderByRequestId } from '@/lib/order-service';
import { purchaseService } from '@/lib/vtpassService';
import { errorHandler } from '@/utils/errorHandler';

export async function POST(req) {
    let requestId = null;
    
    try {
        console.log('[Airtime API] Starting airtime purchase request');
        
        const body = await req.json();
        console.log('[Airtime API] Request body received:', JSON.stringify(body, null, 2));
        
        const {
            requestId: reqId,
            phone,
            serviceID,
            amount,
            cryptoUsed,
            cryptoSymbol,
            transactionHash,
            userAddress
        } = body;

        requestId = reqId; // Store for error handling

        // 1. Validate incoming data
        if (!requestId || !phone || !serviceID || !amount || !cryptoUsed || !cryptoSymbol || !transactionHash || !userAddress) {
            console.error('[Airtime API] Missing required fields:', {
                hasRequestId: !!requestId,
                hasPhone: !!phone,
                hasServiceID: !!serviceID,
                hasAmount: !!amount,
                hasCryptoUsed: !!cryptoUsed,
                hasCryptoSymbol: !!cryptoSymbol,
                hasTransactionHash: !!transactionHash,
                hasUserAddress: !!userAddress
            });
            
            return NextResponse.json({
                error: 'Missing required fields in request body.',
                status: 'error',
                requestId: requestId || 'unknown'
            }, { status: 400 });
        }

        // Ensure amount is a number and positive
        const amountNaira = Number(amount);
        if (isNaN(amountNaira) || amountNaira <= 0) {
            console.error('[Airtime API] Invalid amount:', amount);
            return NextResponse.json({
                error: 'Invalid amount provided.',
                status: 'error',
                requestId
            }, { status: 400 });
        }

        // Validate amount range
        if (amountNaira < 100 || amountNaira > 50000) {
            console.error('[Airtime API] Amount out of range:', amountNaira);
            return NextResponse.json({
                error: 'Amount must be between ₦100 and ₦50,000.',
                status: 'error',
                requestId
            }, { status: 400 });
        }

        console.log(`[Airtime API] Processing order for requestId: ${requestId}`);

        // Check if order already exists (idempotency check)
        let existingOrder;
        try {
            existingOrder = await findOrderByRequestId(requestId);
            console.log(`[Airtime API] Existing order check for ${requestId}:`, existingOrder ? 'found' : 'not found');
        } catch (dbError) {
            console.error(`[Airtime API] Database error checking existing order ${requestId}:`, dbError);
            return NextResponse.json({
                error: 'Database connection error. Please try again.',
                status: 'error',
                requestId
            }, { status: 500 });
        }

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
            
            // If it exists but is in a failed/pending state
            console.warn(`[Airtime API] Order ${requestId} already exists with status: ${existingOrder.vtpassStatus}`);
            return NextResponse.json({
                error: `Order with this Request ID already exists. Current status: ${existingOrder.vtpassStatus}`,
                status: 'error',
                requestId
            }, { status: 409 });
        }

        // 2. Create initial order record in DB with pending status
        const orderData = {
            requestId,
            userAddress,
            transactionHash,
            serviceType: 'airtime',
            serviceID,
            customerIdentifier: phone,
            amountNaira,
            cryptoUsed: Number(cryptoUsed), // Ensure it's a number
            cryptoSymbol,
            onChainStatus: 'confirmed',
            vtpassStatus: 'pending'
        };

        let newOrder;
        try {
            newOrder = await createOrder(orderData);
            console.log(`[Airtime API] Initial order ${requestId} created in DB with ID: ${newOrder._id}`);
        } catch (dbError) {
            console.error(`[Airtime API] Database error creating order ${requestId}:`, dbError);
            return NextResponse.json({
                error: 'Failed to create order record. Please try again.',
                status: 'error',
                requestId
            }, { status: 500 });
        }

        // 3. Call VTpass API to purchase airtime
        const vtpassParams = {
            request_id: requestId,
            serviceID: serviceID,
            billersCode: phone,
            amount: amountNaira,
            phone: phone
        };

        console.log(`[Airtime API] Calling VTpass purchaseService for requestId: ${requestId} with params:`, vtpassParams);
        let vtpassResponse;
        try {
            vtpassResponse = await purchaseService(vtpassParams);
            console.log(`[Airtime API] VTpass raw response for ${requestId}:`, JSON.stringify(vtpassResponse, null, 2));
        } catch (vtpassError) {
            console.error(`[Airtime API] Error calling purchaseService for ${requestId}:`, vtpassError);
            
            // Update order with VTpass call failure
            try {
                await updateOrder(requestId, {
                    vtpassStatus: 'failed_api_call',
                    vtpassResponse: { 
                        message: `VTpass API call failed: ${vtpassError.message || 'Unknown error'}`,
                        timestamp: new Date().toISOString()
                    }
                });
            } catch (updateError) {
                console.error(`[Airtime API] Failed to update order ${requestId} with API call failure:`, updateError);
            }
            
            return NextResponse.json({
                error: `Failed to communicate with VTpass for airtime purchase. Request ID: ${requestId}`,
                status: 'error',
                requestId
            }, { status: 500 });
        }

        // 4. Update order status based on VTpass response
        if (vtpassResponse && typeof vtpassResponse.success !== 'undefined') {
            if (vtpassResponse.success) {
                try {
                    await updateOrder(requestId, {
                        vtpassStatus: 'successful',
                        vtpassResponse: vtpassResponse.data || vtpassResponse
                    });
                    console.log(`[Airtime API] Order ${requestId} successfully processed by VTpass.`);
                    
                    return NextResponse.json({
                        message: 'Airtime purchased successfully!',
                        vtpassData: vtpassResponse.data,
                        orderId: newOrder._id,
                        status: 'success'
                    }, { status: 200 });
                } catch (updateError) {
                    console.error(`[Airtime API] Failed to update successful order ${requestId}:`, updateError);
                    return NextResponse.json({
                        error: 'Airtime purchased but failed to update record. Please contact support.',
                        status: 'error',
                        requestId
                    }, { status: 500 });
                }
            } else {
                try {
                    await updateOrder(requestId, {
                        vtpassStatus: 'failed',
                        vtpassResponse: vtpassResponse.data || { 
                            message: vtpassResponse.error || 'VTpass reported failure without specific error.',
                            timestamp: new Date().toISOString()
                        }
                    });
                } catch (updateError) {
                    console.error(`[Airtime API] Failed to update failed order ${requestId}:`, updateError);
                }
                
                console.error(`[Airtime API] VTpass reported failure for order ${requestId}:`, vtpassResponse.error || vtpassResponse.data);
                return NextResponse.json({
                    error: vtpassResponse.error || 'Failed to purchase airtime from VTpass.',
                    status: 'error',
                    requestId
                }, { status: 500 });
            }
        } else {
            // Malformed VTpass response
            console.error(`[Airtime API] Unexpected VTpass response structure for ${requestId}:`, vtpassResponse);
            
            try {
                await updateOrder(requestId, {
                    vtpassStatus: 'failed_malformed_response',
                    vtpassResponse: { 
                        message: 'Malformed VTpass response', 
                        rawResponse: vtpassResponse,
                        timestamp: new Date().toISOString()
                    }
                });
            } catch (updateError) {
                console.error(`[Airtime API] Failed to update order ${requestId} with malformed response:`, updateError);
            }
            
            return NextResponse.json({
                error: `VTpass returned an unreadable response. Please contact support with Request ID: ${requestId}`,
                status: 'error',
                requestId
            }, { status: 500 });
        }

    } catch (error) {
        console.error(`[Airtime API] Unhandled error for requestId ${requestId}:`, error);
        
        // Ensure we always return JSON
        return NextResponse.json({
            error: 'An unexpected error occurred. Please try again or contact support.',
            status: 'error',
            requestId: requestId || 'unknown',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        }, { status: 500 });
    }
}