import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Credentials': 'true',
};

/**
 * Returns alternative products with better sustainability scores
 */
export const getAlternativeProducts = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const productId = event.queryStringParameters?.productId;
    const category = event.queryStringParameters?.category;
    
    if (!productId && !category) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ 
          message: 'Missing required parameters: productId or category'
        })
      };
    }

    // For now, return mock alternative products
    // In a real implementation, this would query a database or call an external API
    const mockAlternatives = [
      {
        id: 'alt-product-1',
        title: 'Eco-Friendly Alternative 1',
        brand: 'Green Brand',
        sustainabilityScore: 85,
        price: '$24.99',
        imageUrl: 'https://placehold.co/300x300/green/white?text=Eco+Product+1',
        url: 'https://example.com/eco-product-1'
      },
      {
        id: 'alt-product-2',
        title: 'Sustainable Choice 2',
        brand: 'Earth Friendly Co',
        sustainabilityScore: 78,
        price: '$19.99',
        imageUrl: 'https://placehold.co/300x300/green/white?text=Eco+Product+2',
        url: 'https://example.com/eco-product-2'
      },
      {
        id: 'alt-product-3',
        title: 'Better Choice 3',
        brand: 'Sustainable Living',
        sustainabilityScore: 72,
        price: '$29.99',
        imageUrl: 'https://placehold.co/300x300/green/white?text=Eco+Product+3',
        url: 'https://example.com/eco-product-3'
      }
    ];

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(mockAlternatives)
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        message: 'Error retrieving alternative products', 
        error: errorMessage
      })
    };
  }
};
