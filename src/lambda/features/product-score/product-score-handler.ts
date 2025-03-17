import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { validateAmazonUrl, extractProductIdFromUrl } from './url-validator';
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
      
      // Extract product ID from URL
      const productId = extractProductIdFromUrl(url);
      console.log('Extracted product ID:', productId);
      
      // Check if we have a cached result first
      const cachedProduct = await getCachedProduct(productId);
      
      let score: number;
      let aspects: {
        materials: { score: number; maxScore: number; explanation: string; shortExplanation: string };
        manufacturing: { score: number; maxScore: number; explanation: string; shortExplanation: string };
        lifecycle: { score: number; maxScore: number; explanation: string; shortExplanation: string };
        certifications: { score: number; maxScore: number; explanation: string; shortExplanation: string };
      };
      // Use the SustainableProductData interface directly
      let productData: {
        productId: string;
        title: string;
        brand: string;
        mainImage: string;
        productUrl: string;
        categories: string[];
        featureBullets: string[];
      };
      
      if (cachedProduct) {
        // Use cached data
        console.log('Using cached product data for:', productId);
        score = cachedProduct.sustainabilityScore;
        aspects = cachedProduct.aspects;
        
        // Create product data from cache to use in response
        productData = {
          productId: productId,
          title: cachedProduct.title,
          brand: cachedProduct.brand,
          mainImage: cachedProduct.mainImage,
          productUrl: url,
          categories: [], // Provide empty arrays for required fields
          featureBullets: []
        };
      } else {
        // No cached data, fetch from Canopy API
        console.log('No cached data found. Fetching product data for:', productId);
        productData = await fetchProductData(url);
        
        // Calculate new score
        console.log('Calculating new sustainability score for:', productId);
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
        console.log(`Saving product ${productId} to history for user ${userId}`);
        await saveToUserHistory(
          userId,
          productId,
          url
        );
      } else {
        console.log('No user ID found, skipping history save');
      }

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ 
          productId: productId,
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