import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

export const getAlternativeProducts = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const productId = event.queryStringParameters?.productId;

    if (!productId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Product ID is required' }),
      };
    }

    const alternativeProducts = findAlternativeProducts(productId);

    return {
      statusCode: 200,
      body: JSON.stringify(alternativeProducts),
    };
  } catch (error) {
    console.error('Error getting alternative products:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Error finding alternative products' }),
    };
  }
};

function findAlternativeProducts(productId: string): any[] {
  // Placeholder implementation
  return [
    {
      id: `alt-${productId}-1`,
      name: `Alternative Product 1 for ${productId}`,
      sustainabilityScore: 85
    },
    {
      id: `alt-${productId}-2`,
      name: `Alternative Product 2 for ${productId}`,
      sustainabilityScore: 92
    }
  ];
}
