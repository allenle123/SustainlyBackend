import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getProductScore } from './features/product-score';
import { getAlternativeProducts } from './features/get-alternative-products';

// NEW BUILD BEW BULID NEWBUILD

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const path = event.path;
    const method = event.httpMethod;

    switch (true) {
      case path.includes('/product-score') && method === 'GET':
        return await getProductScore(event);
      case path.includes('/alternative-products') && method === 'GET':
        return await getAlternativeProducts(event);
      default:
        return {
          statusCode: 404,
          body: JSON.stringify({ message: 'Not Found' }),
        };
    }
  } catch (error) {
    console.error('Error processing request:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal Server Error' }),
    };
  }
};
