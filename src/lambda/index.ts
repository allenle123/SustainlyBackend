import * as dotenv from 'dotenv';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env file
config({ path: resolve(__dirname, '../../.env') });

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getProductScore } from './features/product-score/product-score-handler';
// import { getAlternativeProducts } from './features/alternative-products/alternative-products-handler';
import { getUserHistory, clearUserHistory } from './features/user-history/user-history-handler';

// Import shared CORS headers
import { corsHeaders } from './utils/cors-headers';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        // Log full event for debugging
        console.log('Full Lambda event:', JSON.stringify(event, null, 2));

        // Validate event object
        if (!event) {
            console.error('Received undefined event');
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Invalid request: No event data' }),
            };
        }

        // Safely extract path and method
        const path = event.path || event.resource || '';
        const method = event.httpMethod || 'UNKNOWN';

        console.log('Processed path:', path);
        console.log('Processed method:', method);

        // Handle OPTIONS requests for CORS preflight
        if (method === 'OPTIONS') {
            return {
                statusCode: 200,
                headers: corsHeaders,
                body: '',
            };
        }

        // Route to the appropriate handler based on the path and method
        if (path === '/product-score' && method === 'GET') {
            return await getProductScore(event);
            // } else if (path === '/alternative-products' && method === 'GET') {
            //   return await getAlternativeProducts(event);
        } else if (path === '/user-history' && method === 'GET') {
            return await getUserHistory(event);
        } else if (path === '/user-history' && method === 'DELETE') {
            return await clearUserHistory(event);
        } else {
            console.warn('Unhandled route:', { path, method });
            return {
                statusCode: 404,
                headers: corsHeaders,
                body: JSON.stringify({
                    message: 'Not Found',
                    details: { path, method },
                }),
            };
        }
    } catch (error) {
        console.error('Error processing request:', {
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            errorStack: error instanceof Error ? error.stack : 'No stack trace',
            errorDetails: error,
        });

        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({
                message: 'Internal Server Error',
                error: error instanceof Error ? error.message : 'Unknown error',
            }),
        };
    }
};
