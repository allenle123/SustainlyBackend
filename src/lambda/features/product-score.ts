import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { validateAmazonUrl } from './validate-amazon-url';
import { fetchProductData } from './fetch-product-data';
import { calculateSustainabilityScore } from './calculate-sustainability-score';

export const getProductScore = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const url = event.queryStringParameters?.url;

    if (!url || typeof url !== 'string' || !validateAmazonUrl(url)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          message: 'Invalid Amazon product URL',
          details: {
            urlType: typeof url,
            urlValue: url,
            fullQueryParams: event.queryStringParameters
          }
        })
      };
    }

    try {
      const productData = await fetchProductData(url);
      const sustainabilityScore = calculateSustainabilityScore(productData);

      return {
        statusCode: 200,
        headers: { 
          'Content-Type': 'application/json', 
          'Access-Control-Allow-Origin': '*' 
        },
        body: JSON.stringify({ 
          productData, 
          sustainabilityScore 
        })
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      return {
        statusCode: 500,
        headers: { 
          'Content-Type': 'application/json', 
          'Access-Control-Allow-Origin': '*' 
        },
        body: JSON.stringify({ 
          message: 'Error fetching product data', 
          error: errorMessage 
        })
      };
    }
  } catch (topLevelError: unknown) {
    const errorMessage = topLevelError instanceof Error ? topLevelError.message : 'Unknown error';
    
    return {
      statusCode: 500,
      headers: { 
        'Content-Type': 'application/json', 
        'Access-Control-Allow-Origin': '*' 
      },
      body: JSON.stringify({ 
        message: 'Critical error processing request', 
        error: errorMessage 
      })
    };
  }
};
