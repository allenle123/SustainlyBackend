import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { validateAmazonUrl } from './url-validator';
import { fetchProductData } from './product-data-fetcher';
import { calculateSustainabilityScore } from './sustainability-calculator';

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
      const { score, attributes, reasoning } = await calculateSustainabilityScore(productData);

      return {
        statusCode: 200,
        headers: { 
          'Content-Type': 'application/json', 
          'Access-Control-Allow-Origin': '*' 
        },
        body: JSON.stringify({ 
          productData, 
          sustainabilityScore: score,
          sustainabilityAttributes: attributes,
          sustainabilityReasoning: reasoning
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
          message: 'Error processing product data', 
          error: errorMessage,
          sustainabilityScore: 50,
          sustainabilityAttributes: {
            brand: 'Unknown',
            categories: [],
            sustainabilityKeywords: [],
            materialFeatures: []
          },
          sustainabilityReasoning: 'Unable to generate sustainability assessment'
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
        error: errorMessage,
        sustainabilityScore: 50,
        sustainabilityAttributes: {
          brand: 'Unknown',
          categories: [],
          sustainabilityKeywords: [],
          materialFeatures: []
        },
        sustainabilityReasoning: 'Unable to generate sustainability assessment'
      })
    };
  }
};
