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

// API key validation using environment variable
const VALID_API_KEYS = process.env.API_KEYS ? process.env.API_KEYS.split(',') : [];

// Function to validate API key
const validateApiKey = (apiKey: string | undefined): boolean => {
    if (!apiKey) return false;
    return VALID_API_KEYS.includes(apiKey);
};

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

        // Validate API key for non-OPTIONS requests
        // Skip validation if the request comes from API Gateway (it already validated the key)
        const apiKey = event.headers?.['x-api-key'] || event.headers?.['X-Api-Key'];
        const isFromApiGateway = !!event.requestContext?.apiId;
        
        // Enhanced logging for API key validation
        console.log('API Key Validation:', {
            receivedApiKey: apiKey ? `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}` : 'none',
            isFromApiGateway,
            validationRequired: !isFromApiGateway,
            validationResult: isFromApiGateway ? 'skipped' : validateApiKey(apiKey)
        });
        
        if (event.httpMethod !== 'OPTIONS' && !isFromApiGateway && !validateApiKey(apiKey)) {
            console.warn('Invalid or missing API key');
            return {
                statusCode: 403,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Forbidden: Invalid or missing API key' }),
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
