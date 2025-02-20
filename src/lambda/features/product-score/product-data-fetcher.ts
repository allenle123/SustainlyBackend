import axios, { AxiosRequestConfig } from 'axios';
import { MOCK_RESPONSE } from './mock-data';

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

// Mock data configuration
const USE_MOCK_DATA = true; // Set to false to use real API

async function rainforestApiCall(url: string) {
  try {
    if (USE_MOCK_DATA) {
      console.log('Using mock product data');
      return MOCK_RESPONSE; // Your mock response structure
    }

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
    // Fetch product data from Rainforest API
    const productData = await rainforestApiCall(url);

    // Extract relevant information from the product data
    const title = productData.product.title;
    const brand = productData.product.brand;
    const productUrl = productData.product.link;
    const specifications = productData.product.variants[0].dimensions || [];
    const categories = productData.product.categories || [];
    const featureBullets = productData.product.feature_bullets || [];
    const description = productData.product.description;
    const rating = {
      overall: productData.product.rating || 0,
      totalRatings: productData.product.ratings_total || 0
    };

    // Construct and return the sustainable product data
    return {
      productId: productData.product.asin,
      title,
      brand,
      productUrl,
      specifications,
      categories,
      featureBullets,
      description,
      rating
    };
  } catch (error) {
    console.error('Error fetching product data:', error);
    throw error; // Propagate the error to the caller
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
