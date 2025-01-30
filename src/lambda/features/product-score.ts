import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import axios, { AxiosError, AxiosRequestConfig } from 'axios';

// IMPORTANT: This is a temporary hardcoding for testing. NEVER commit this to version control.
const RAINFOREST_API_KEY = 'D86AE03BDF294F65A20C08ED35075FCF';
const RAINFOREST_BASE_URL = 'https://api.rainforestapi.com';

export const getProductScore = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const url = event.queryStringParameters?.url;

    if (!url || typeof url !== 'string') {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          message: 'Invalid or missing product URL',
          details: {
            urlType: typeof url,
            urlValue: url,
            fullQueryParams: event.queryStringParameters
          }
        })
      };
    }

    const amazonUrlRegex = /^https:\/\/www\.amazon\.(com|co\.uk|de|fr|ca|jp|in)\/.*\/dp\/[A-Z0-9]+/;
    if (!amazonUrlRegex.test(url)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          message: 'Invalid Amazon product URL format',
          expectedFormat: 'https://www.amazon.{domain}/...../dp/{ASIN}'
        })
      };
    }

    if (!RAINFOREST_API_KEY) {
      return {
        statusCode: 500,
        body: JSON.stringify({ 
          message: 'Internal server configuration error' 
        })
      };
    }

    const params = {
      api_key: RAINFOREST_API_KEY,
      type: 'product',
      url: url,
      output: 'json'
    };

    const axiosConfig: AxiosRequestConfig = {
      method: 'get',
      url: `${RAINFOREST_BASE_URL}/request`,
      params,
      timeout: 8000,  
      headers: {
        'User-Agent': 'SustainLy/1.0',
        'Accept': 'application/json'
      }
    };

    try {
      const response = await axios.request(axiosConfig);

      if (!response.data || !response.data.product) {
        throw new Error('Invalid API response');
      }

      const productData = response.data.product;
      const sustainabilityScore = calculatePlaceholderSustainabilityScore(productData);

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          productData: productData,
          sustainabilityScore: sustainabilityScore
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
          message: 'Error processing product score',
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
        message: 'Critical error in product score processing',
        error: errorMessage
      })
    };
  }
};

function calculatePlaceholderSustainabilityScore(productData: any): number {
  return Math.floor(Math.random() * 101);
}
