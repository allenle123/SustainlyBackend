import axios, { AxiosRequestConfig } from 'axios';

// Use environment variable for API key
const RAINFOREST_API_KEY = process.env.RAINFOREST_API_KEY;

if (!RAINFOREST_API_KEY) {
  throw new Error('RAINFOREST_API_KEY is not set in the environment');
}

const RAINFOREST_BASE_URL = 'https://api.rainforestapi.com';

export interface SustainableProductData {
  title: string;
  brand: string;
  description: string;
  categories: string[];
  attributes: {
    material: string[];
    specialFeatures: string[];
    recommendedUses: string[];
  };
  featureBullets: string[];
  rating: {
    overall: number;
    totalRatings: number;
  };
}

async function rainforestApiCall(url: string) {
  try {
    // Log the URL being fetched
    console.log(`Fetching product data for URL: ${url}`);

    // Validate URL
    if (!url || typeof url !== 'string') {
      console.warn('Invalid URL provided:', url);
      throw new Error('Invalid URL provided for product data fetching');
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
      timeout: 15000, // Increased timeout as per previous change
      headers: {
        'User-Agent': 'SustainLy/1.0',
        'Accept': 'application/json'
      }
    };

    // Fetch product data from Rainforest API
    const response = await axios.request(axiosConfig);

    // Log the raw response data
    console.log('Rainforest API Raw Response:', JSON.stringify(response.data, null, 2));

    // Validate response
    if (!response.data || !response.data.product) {
      console.warn('No product data found in Rainforest API response');
      throw new Error('Unable to extract product data from Rainforest API');
    }

    // Extract and return relevant product information
    const productData = response.data.product;

    // Log the processed product data
    console.log('Processed Product Data:', JSON.stringify(productData, null, 2));

    return productData;
  } catch (error) {
    // Comprehensive error logging
    console.error('Error in rainforestApiCall:', {
      errorName: error instanceof Error ? error.name : 'Unknown Error',
      errorMessage: error instanceof Error ? error.message : 'No error message',
      errorStack: error instanceof Error ? error.stack : 'No stack trace',
      url: url
    });

    // Rethrow the error to be handled by the caller
    throw error;
  }
}

export async function fetchProductData(url: string): Promise<SustainableProductData> {
  try {
    // Existing Rainforest API call logic remains the same
    const response = await rainforestApiCall(url);
    
    // Extract only sustainability-relevant information
    return {
      title: response.title || 'Unknown Product',
      brand: response.brand || 'Unknown Brand',
      description: response.description || '',
      
      // Extract meaningful categories
      categories: response.categories
        ?.map((cat: any) => cat.name)
        .filter((name: string) => 
          name && 
          !['All Departments'].includes(name)
        ) || [],
      
      // Extract relevant attributes
      attributes: {
        material: response.attributes
          ?.filter((attr: any) => 
            ['Material', 'Material Feature'].includes(attr.name)
          )
          .map((attr: any) => attr.value) || [],
        
        specialFeatures: response.attributes
          ?.filter((attr: any) => 
            attr.name === 'Special Feature'
          )
          .map((attr: any) => attr.value) || [],
        
        recommendedUses: response.attributes
          ?.filter((attr: any) => 
            attr.name === 'Recommended Uses For Product'
          )
          .map((attr: any) => attr.value) || []
      },
      
      // Extract feature bullets related to sustainability
      featureBullets: response.feature_bullets
        ?.filter((bullet: string) => 
          bullet.toLowerCase().includes('sustainable') || 
          bullet.toLowerCase().includes('eco') || 
          bullet.toLowerCase().includes('environment')
        ) || [],
      
      // Basic rating information
      rating: {
        overall: response.rating || 0,
        totalRatings: response.ratings_total || 0
      }
    };
  } catch (error) {
    console.error('Error fetching product data:', error);
    throw error;
  }
}
