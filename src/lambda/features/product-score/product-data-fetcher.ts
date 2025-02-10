import axios, { AxiosRequestConfig } from 'axios';

// Use environment variable for API key
const RAINFOREST_API_KEY = process.env.RAINFOREST_API_KEY;

if (!RAINFOREST_API_KEY) {
  throw new Error('RAINFOREST_API_KEY is not set in the environment');
}

const RAINFOREST_BASE_URL = 'https://api.rainforestapi.com';

// Define specification interface
export interface ProductSpecification {
  name: string;
  value: string;
}

export interface SustainableProductData {
  productId: string;
  title: string;
  brand: string;
  productUrl: string;
  specifications: ProductSpecification[];
  categories: string[];
  featureBullets: string[];
  description: string;
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
      timeout: 25000, // Increased timeout as per previous change
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
    const productData = response;

    return {
      productId: productData.asin || '',
      title: productData.title || '',
      brand: extractBrand(productData.specifications) || '',
      productUrl: productData.link || url,
      specifications: productData.specifications || [],
      categories: productData.categories
        ?.map((cat: any) => cat.name)
        .filter((name: string) => 
          name && 
          !['All Departments'].includes(name)
        ) || [],
      featureBullets: productData.feature_bullets || [],
      description: productData.description || '',
      rating: {
        overall: productData.rating || 0,
        totalRatings: productData.ratings_total || 0
      }
    };
  } catch (error) {
    console.error('Error fetching product data:', error);
    throw error;
  }
}

// Helper method to extract brand from specifications
function extractBrand(specifications?: ProductSpecification[]): string {
  if (!specifications) return '';
  
  const brandSpec = specifications.find(spec => 
    spec.name.toLowerCase() === 'brand'
  );
  
  return brandSpec?.value || '';
}
