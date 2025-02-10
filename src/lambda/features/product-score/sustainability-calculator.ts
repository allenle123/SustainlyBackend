import { GoogleGenerativeAI, HarmCategory, SafetySetting, HarmBlockThreshold } from "@google/generative-ai";
import { SustainableProductData } from "./product-data-fetcher";

// Use environment variable for API key
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is not set in the environment');
}

// Initialize Gemini AI client
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

export interface SustainabilityAttributes {
  brand: string;
  categories: string[];
  sustainabilityKeywords: string[];
  materialFeatures: string[];
}

export interface SustainabilityAssessment {
  score: number;
  attributes: SustainabilityAttributes;
  reasoning?: string;
}

export function extractSustainabilityAttributes(productData: SustainableProductData): SustainabilityAttributes {
  // Predefined sustainability-related keywords
  const sustainabilityKeywords = [
    'eco', 'sustainable', 'green', 'recycled', 
    'organic', 'biodegradable', 'renewable',
    'responsibly sourced', 'environmentally friendly'
  ];

  // Extract relevant attributes
  const attributes: SustainabilityAttributes = {
    brand: productData.brand,
    categories: productData.categories,
    sustainabilityKeywords: [],
    materialFeatures: []
  };

  // Check for sustainability keywords in title, description, and feature bullets
  const searchText = [
    productData.title.toLowerCase(),
    productData.description.toLowerCase(),
    ...productData.featureBullets.map(b => b.toLowerCase())
  ].join(' ');

  // Find matching sustainability keywords
  attributes.sustainabilityKeywords = sustainabilityKeywords
    .filter(keyword => searchText.includes(keyword.toLowerCase()));

  // Extract material features that might indicate sustainability
  attributes.materialFeatures = [
    ...productData.attributes.material,
    ...productData.attributes.specialFeatures
  ];

  return attributes;
}

export async function calculateSustainabilityScore(productData: SustainableProductData): Promise<SustainabilityAssessment> {
  // Create an abort controller to handle timeouts more explicitly
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 55000); // 55 seconds timeout

  try {
    // Basic validation of product data
    if (!productData || Object.keys(productData).length === 0) {
      return {
        score: 50,
        attributes: {
          brand: 'Unknown',
          categories: [],
          sustainabilityKeywords: [],
          materialFeatures: []
        }
      };
    }

    // Extract sustainability attributes
    const attributes = extractSustainabilityAttributes(productData);

    // Prepare prompt for Gemini
    const prompt = `
      Evaluate the sustainability of this product based on the following details:
      
      Product Title: ${productData.title}
      Brand: ${productData.brand}
      Categories: ${productData.categories.join(', ')}
      Rating: ${productData.rating.overall} (${productData.rating.totalRatings} reviews)
      
      Provide a sustainability score from 0-100 and brief reasoning. 
      Consider factors like:
      - Materials used
      - Manufacturing process
      - Energy efficiency
      - Recyclability
      - Environmental impact
      - Product longevity
      
      Output format:
      Score: [0-100 number]
      Reasoning: [Brief explanation]
    `;

    console.log('Gemini Prompt:', prompt);

    // Call Gemini API with enhanced error handling and timeout
    let result;
    try {
      result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: 150,
        },
        safetySettings: [
          {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_NONE
          },
          {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_NONE
          }
        ] as SafetySetting[]
      });
    } catch (apiError: any) {
      // Clear the timeout to prevent memory leaks
      clearTimeout(timeoutId);

      // Comprehensive error logging
      console.error('Gemini API Error Details:', {
        errorName: apiError.name,
        errorMessage: apiError.message,
        errorCode: apiError.code,
        errorStatus: apiError.status,
        isTimeout: apiError.name === 'AbortError' || apiError.message.includes('timeout'),
        fullError: JSON.stringify(apiError, Object.getOwnPropertyNames(apiError))
      });

      // Fallback scoring based on attributes
      const baseScore = 50;
      const scoreBoost = 
        (attributes.sustainabilityKeywords.length * 5) + 
        (productData.rating.overall >= 4.5 ? 10 : 0);

      return {
        score: Math.min(baseScore + scoreBoost, 100),
        attributes,
        reasoning: apiError.name === 'AbortError' 
          ? 'Sustainability assessment timed out' 
          : `Fallback scoring due to API error: ${apiError.message || 'Unknown error'}`
      };
    } finally {
      // Ensure timeout is cleared
      clearTimeout(timeoutId);
    }

    // Parse the response
    const responseText = result.response.text();
    console.log('Gemini Response:', responseText);
    
    // Extract score and reasoning using regex
    const scoreMatch = responseText.match(/Score:\s*(\d+)/);
    const reasoningMatch = responseText.match(/Reasoning:\s*(.+)/s);

    const score = scoreMatch ? parseInt(scoreMatch[1], 10) : 50;
    const reasoning = reasoningMatch ? reasoningMatch[1].trim() : 'Unable to generate detailed reasoning';

    return {
      score: Math.min(Math.max(score, 0), 100),
      attributes,
      reasoning
    };
  } catch (error: any) {
    // Clear the timeout to prevent memory leaks
    clearTimeout(timeoutId);

    // Comprehensive top-level error logging
    console.error('Unexpected error in sustainability scoring:', {
      errorName: error.name,
      errorMessage: error.message,
      errorStack: error.stack,
      isTimeout: error.name === 'AbortError' || error.message.includes('timeout'),
      fullError: JSON.stringify(error, Object.getOwnPropertyNames(error))
    });
    
    // Fallback response
    return {
      score: 50,
      attributes: {
        brand: productData.brand,
        categories: productData.categories,
        sustainabilityKeywords: [],
        materialFeatures: []
      },
      reasoning: error.name === 'AbortError' 
        ? 'Sustainability assessment timed out' 
        : `Unable to generate sustainability assessment: ${error.message || 'Unexpected error'}`
    };
  }
}
