// utils/errorHandler.js
import { NextResponse } from 'next/server';

/**
 * Centralized error handler for API routes.
 * @param {Error} error - The error object.
 * @param {string} routeName - The name of the API route where the error occurred (for logging).
 * @returns {NextResponse} A JSON response with error details.
 */
export function errorHandler(error, routeName = 'API Route') {
    console.error(`Error in ${routeName}:`, error);

    let statusCode = 500;
    let message = 'Internal server error';
    let details = error.message;

    // Custom error handling based on error type or properties
    if (error.name === 'ValidationError') { // Example for Mongoose validation errors
        statusCode = 400;
        message = 'Validation Error';
        details = error.message; // Or parse error.errors for more specific details
    } else if (error.message.includes('Missing required fields')) {
        statusCode = 400;
        message = 'Bad Request';
    } else if (error.message.includes('already exists')) { // For idempotency checks
        statusCode = 409; // Conflict
        message = 'Resource Conflict';
    } else if (error.message.includes('not found')) {
        statusCode = 404;
        message = 'Not Found';
    }
    // Add more custom error handling as needed for specific scenarios

    return NextResponse.json(
        {
            error: message,
            details: details,
            requestId: error.requestId || undefined
        },
        {
            status: statusCode,
            headers: {
                'Access-Control-Allow-Origin': 'https://wagmichargev2.vercel.app', // Allow your Vercel frontend
                'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS', // Allowed methods
                'Access-Control-Allow-Headers': 'Content-Type, Authorization', // Allowed headers
                'Access-Control-Allow-Credentials': 'true', // If you use cookies/credentials
            },
        }
    );
}
