import { DynamoDB } from 'aws-sdk';
import { SustainableProductData } from './product-data-fetcher';
import { SustainabilityAssessment } from './sustainability-calculator';

const dynamoDB = new DynamoDB.DocumentClient();
const TABLE_NAME = process.env.DYNAMODB_TABLE || '';

export interface CachedProductData {
  productId: string;  // Partition key
  productData: SustainableProductData;
  sustainabilityScore: number;
  sustainabilityReasoning: string;
  categoryWeights: {
    [key: string]: number;  // Category name to weight mapping
  };
  lastUpdated: string;  // ISO date string
  ttl: number;  // Time-to-live in Unix timestamp
}

export async function getCachedProduct(productId: string): Promise<CachedProductData | null> {
  try {
    const result = await dynamoDB.get({
      TableName: TABLE_NAME,
      Key: { productId }
    }).promise();

    return result.Item as CachedProductData || null;
  } catch (error) {
    console.error('Error fetching cached product:', error);
    return null;
  }
}

export async function cacheProductData(
  productId: string,
  productData: SustainableProductData,
  assessment: SustainabilityAssessment,
  categoryWeights: { [key: string]: number }
): Promise<void> {
  const now = new Date();
  const ttl = Math.floor(now.getTime() / 1000) + (30 * 24 * 60 * 60); // 30 days TTL

  const item: CachedProductData = {
    productId,
    productData,
    sustainabilityScore: assessment.score,
    sustainabilityReasoning: assessment.reasoning || '',
    categoryWeights,
    lastUpdated: now.toISOString(),
    ttl
  };

  try {
    await dynamoDB.put({
      TableName: TABLE_NAME,
      Item: item
    }).promise();
  } catch (error) {
    console.error('Error caching product data:', error);
    throw error;
  }
}
