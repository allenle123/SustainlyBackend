import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getProductScore } from './features/product-score';
import { getAlternativeProducts } from './features/get-alternative-products';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    // Log full event for debugging
    console.log('Full Lambda event:', JSON.stringify(event, null, 2));

    // Validate event object
    if (!event) {
      console.error('Received undefined event');
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Invalid request: No event data' }),
      };
    }

    // Safely extract path and method
    const path = event.path || event.resource || '';
    const method = event.httpMethod || 'UNKNOWN';

    console.log('Processed path:', path);
    console.log('Processed method:', method);

    switch (true) {
      case path.includes('/product-score') && method === 'GET':
        return await getProductScore(event);
      case path.includes('/alternative-products') && method === 'GET':
        return await getAlternativeProducts(event);
      default:
        console.warn('Unhandled route:', { path, method });
        return {
          statusCode: 404,
          body: JSON.stringify({ 
            message: 'Not Found',
            details: { path, method }
          }),
        };
    }
  } catch (error) {
    console.error('Error processing request:', {
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorStack: error instanceof Error ? error.stack : 'No stack trace',
      errorType: typeof error
    });
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        message: 'Internal Server Error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
    };
  }
};
