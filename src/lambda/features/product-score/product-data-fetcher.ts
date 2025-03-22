import { MOCK_RESPONSE } from './mock-data';

// Use environment variable for API key
const CANOPY_API_KEY = process.env.CANOPY_API_KEY;

if (!CANOPY_API_KEY) {
  throw new Error('CANOPY_API_KEY is not set in the environment');
}

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
  mainImage: string;
  categories: string[];
  featureBullets: string[];
}

interface CanopyApiResponse {
  data: {
    amazonProduct: {
      title: string;
      brand: string;
      mainImageUrl: string;
      categories: Array<{ name: string }>;
      asin: string;
      featureBullets: string[];
    };
  };
}

// Mock data configuration
const USE_MOCK_DATA = false; // Set to false to use real API

const CANOPY_QUERY = `
  query amazonProduct($url: String!) {
    amazonProduct(input: { urlLookup: { url: $url } }) {
      title
      brand
      mainImageUrl
      categories {
        name
      }
      asin
      featureBullets
    }
  }
`;

async function canopyApiCall(url: string) {
  try {
    if (USE_MOCK_DATA) {
      console.log('Using mock product data');
      const mockProduct = MOCK_RESPONSE.data.amazonProduct;
      return {
        title: mockProduct.title,
        brand: mockProduct.brand,
        mainImageUrl: mockProduct.mainImageUrl,
        categories: mockProduct.categories,
        asin: mockProduct.asin,
        featureBullets: mockProduct.featureBullets
      };
    }

    console.log(`Fetching product data for URL: ${url}`);

    if (!url || typeof url !== 'string') {
      console.warn('Invalid URL provided:', url);
      throw new Error('Invalid URL provided for product data fetching');
    }

    const response = await fetch('https://graphql.canopyapi.co/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'API-KEY': CANOPY_API_KEY!
      },
      body: JSON.stringify({
        query: CANOPY_QUERY,
        variables: { url }
      }),
    });

    const data = await response.json() as CanopyApiResponse;
    console.log('Canopy API Raw Response:', JSON.stringify(data, null, 2));

    if (!data.data?.amazonProduct) {
      console.warn('No product data found in Canopy API response');
      throw new Error('Unable to extract product data from Canopy API');
    }

    return data.data.amazonProduct;
  } catch (error) {
    console.error('Error in canopyApiCall:', {
      errorName: error instanceof Error ? error.name : 'Unknown Error',
      errorMessage: error instanceof Error ? error.message : 'No error message',
      errorStack: error instanceof Error ? error.stack : 'No stack trace',
      url: url
    });
    throw error;
  }
}

export async function fetchProductData(url: string): Promise<SustainableProductData> {
  try {
    const product = await canopyApiCall(url);

    const productData: SustainableProductData = {
      productId: product.asin || '',
      title: product.title || '',
      brand: product.brand || '',
      productUrl: url,
      mainImage: product.mainImageUrl || '',
      categories: product.categories?.map((cat: { name: string }) => cat.name) || [],
      featureBullets: product.featureBullets || []
    };

    return productData;
  } catch (error) {
    console.error('Error fetching product data:', error);
    throw error;
  }
}
