import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { validateAmazonUrl } from './url-validator';
import { fetchProductData } from './product-data-fetcher';
import { calculateSustainabilityScore } from './sustainability-calculator';
import { getCachedProduct, cacheProductData } from './product-cache';

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
      // First fetch the product data to get the product ID
      const productData = await fetchProductData(url);
      
      // Check if we have a cached result
      const cachedProduct = await getCachedProduct(productData.productId);
      
      let score: number;
      let aspects: {
        materials: { score: number; maxScore: number; explanation: string };
        manufacturing: { score: number; maxScore: number; explanation: string };
        lifecycle: { score: number; maxScore: number; explanation: string };
        certifications: { score: number; maxScore: number; explanation: string };
      };
      
      if (cachedProduct) {
        // Use cached data
        console.log('Using cached product data for:', productData.productId);
        score = cachedProduct.sustainabilityScore;
        aspects = cachedProduct.aspects;
      } else {
        // Calculate new score
        console.log('Calculating new sustainability score for:', productData.productId);
        const assessment = await calculateSustainabilityScore(productData);
        score = assessment.score;
        aspects = assessment.aspects;
        
        // Cache the results
        await cacheProductData(
          productData.productId,
          productData.title,
          productData.mainImage,
          assessment,
          aspects
        );
      }

      return {
        statusCode: 200,
        headers: { 
          'Content-Type': 'application/json', 
          'Access-Control-Allow-Origin': '*' 
        },
        body: JSON.stringify({ 
          productId: productData.productId,
          title: productData.title,
          sustainabilityScore: score,
          mainImage: productData.mainImage,
          aspects
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
