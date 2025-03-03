import { DynamoDB } from 'aws-sdk';
import { SustainabilityAssessment } from './sustainability-calculator';

const dynamoDB = new DynamoDB.DocumentClient();
const TABLE_NAME = process.env.DYNAMODB_TABLE || '';

export interface CachedProductData {
  productId: string;  // Partition key
  title: string;      // Product title
  brand: string;      // Product brand
  sustainabilityScore: number;
  mainImage: string;
  aspects: {
    materials: {
      score: number;
      maxScore: number;
      explanation: string;
    };
    manufacturing: {
      score: number;
      maxScore: number;
      explanation: string;
    };
    lifecycle: {
      score: number;
      maxScore: number;
      explanation: string;
    };
    certifications: {
      score: number;
      maxScore: number;
      explanation: string;
    };
  };
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
  title: string,
  mainImage: string,
  assessment: SustainabilityAssessment,
  aspects: {
    materials: { score: number; maxScore: number; explanation: string };
    manufacturing: { score: number; maxScore: number; explanation: string };
    lifecycle: { score: number; maxScore: number; explanation: string };
    certifications: { score: number; maxScore: number; explanation: string };
  },
  brand: string
): Promise<void> {
  const item: CachedProductData = {
    productId,
    title,
    brand,
    sustainabilityScore: assessment.score,
    mainImage,
    aspects
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
