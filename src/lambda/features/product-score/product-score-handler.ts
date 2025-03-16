import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { validateAmazonUrl } from './url-validator';
import { fetchProductData } from './product-data-fetcher';
import { calculateSustainabilityScore } from './sustainability-calculator';
import { getCachedProduct, cacheProductData } from './product-cache';
import { getUserIdFromToken, saveToUserHistory } from '../../utils/supabase-client';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Credentials': 'true',
};

export const getProductScore = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const url = event.queryStringParameters?.url;
    
    // Log headers to debug authentication issues
    console.log('Request headers:', JSON.stringify(event.headers));

    if (!url || typeof url !== 'string' || !validateAmazonUrl(url)) {
      return {
        statusCode: 400,
        headers: corsHeaders,
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
      // Extract user ID from authorization header if present
      const authHeader = event.headers?.Authorization || event.headers?.authorization;
      console.log('Auth header:', authHeader);
      
      const userId = await getUserIdFromToken(authHeader);
      console.log('Extracted user ID:', userId);
      
      // First fetch the product data to get the product ID
      const productData = await fetchProductData(url);
      
      // Check if we have a cached result
      const cachedProduct = await getCachedProduct(productData.productId);
      
      let score: number;
      let aspects: {
        materials: { score: number; maxScore: number; explanation: string; shortExplanation: string };
        manufacturing: { score: number; maxScore: number; explanation: string; shortExplanation: string };
        lifecycle: { score: number; maxScore: number; explanation: string; shortExplanation: string };
        certifications: { score: number; maxScore: number; explanation: string; shortExplanation: string };
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
          productData.brand
        );
      }

      // If user is authenticated, save to their history
      if (userId) {
        console.log(`Saving product ${productData.productId} to history for user ${userId}`);
        await saveToUserHistory(
          userId,
          productData.productId,
          url
        );
      } else {
        console.log('No user ID found, skipping history save');
      }

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ 
          productId: productData.productId,
          title: productData.title,
          brand: productData.brand,
          sustainabilityScore: score,
          mainImage: productData.mainImage,
          aspects
        })
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      return {
        statusCode: 500,
        headers: corsHeaders,
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
      headers: corsHeaders,
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