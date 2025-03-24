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
  categories: string[]; // Product categories
  aspects: {
    materials: {
      score: number;
      maxScore: number;
      explanation: string;
      shortExplanation: string;
    };
    manufacturing: {
      score: number;
      maxScore: number;
      explanation: string;
      shortExplanation: string;
    };
    lifecycle: {
      score: number;
      maxScore: number;
      explanation: string;
      shortExplanation: string;
    };
    certifications: {
      score: number;
      maxScore: number;
      explanation: string;
      shortExplanation: string;
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
  brand: string,
  categories: string[] = []
): Promise<void> {
  const item: CachedProductData = {
    productId,
    title,
    brand,
    sustainabilityScore: assessment.score,
    mainImage,
    categories,
    aspects: {
      materials: {
        score: assessment.aspects.materials.score,
        maxScore: assessment.aspects.materials.maxScore,
        explanation: assessment.aspects.materials.explanation,
        shortExplanation: assessment.aspects.materials.shortExplanation
      },
      manufacturing: {
        score: assessment.aspects.manufacturing.score,
        maxScore: assessment.aspects.manufacturing.maxScore,
        explanation: assessment.aspects.manufacturing.explanation,
        shortExplanation: assessment.aspects.manufacturing.shortExplanation
      },
      lifecycle: {
        score: assessment.aspects.lifecycle.score,
        maxScore: assessment.aspects.lifecycle.maxScore,
        explanation: assessment.aspects.lifecycle.explanation,
        shortExplanation: assessment.aspects.lifecycle.shortExplanation
      },
      certifications: {
        score: assessment.aspects.certifications.score,
        maxScore: assessment.aspects.certifications.maxScore,
        explanation: assessment.aspects.certifications.explanation,
        shortExplanation: assessment.aspects.certifications.shortExplanation
      }
    }
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
