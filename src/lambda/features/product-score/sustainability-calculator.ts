import { GoogleGenerativeAI, HarmCategory, SafetySetting, HarmBlockThreshold } from "@google/generative-ai";
import { SustainableProductData } from "./product-data-fetcher";

// Use environment variable for API key
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is not set in the environment');
}

// Initialize Gemini AI client
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

export interface SustainabilityAssessment {
  score: number;
  reasoning?: string;
}

export async function calculateSustainabilityScore(productData: SustainableProductData): Promise<SustainabilityAssessment> {
  // Create an abort controller to handle timeouts more explicitly
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 55000); // 55 seconds timeout

  try {
    // Basic validation of product data
    if (!productData || Object.keys(productData).length === 0) {
      return {
        score: 50
      };
    }

    // Prepare prompt for Gemini
    const prompt = `
      Evaluate the sustainability of this product based on the following comprehensive details:
      
      Product Information:
      - Title: ${productData.title}
      - Brand: ${productData.brand}
      - Product URL: ${productData.productUrl}
      
      Categories: ${productData.categories.join(', ')}
      
      Ratings:
      - Overall Rating: ${productData.rating.overall}/5
      - Total Reviews: ${productData.rating.totalRatings}
      
      Product Specifications:
      ${productData.specifications.map(spec => `- ${spec.name}: ${spec.value}`).join('\n')}
      
      Feature Highlights:
      ${productData.featureBullets.map((bullet, index) => `${index + 1}. ${bullet}`).join('\n')}
      
      Product Description:
      ${productData.description}
      
      Sustainability Assessment Criteria:
      Provide a sustainability score from 0-100 and brief reasoning. 
      Consider factors like:
      - Materials used (environmental impact, recyclability)
      - Manufacturing process
      - Energy efficiency
      - Product longevity
      - Potential for reuse or recycling
      - Environmental certifications or standards
      
      Output format:
      Score: [0-100 number]
      Reasoning: [Brief explanation highlighting key sustainability factors]
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

      // Fallback scoring
      const baseScore = 50;
      const scoreBoost = 
        (productData.rating.overall >= 4.5 ? 10 : 0);

      return {
        score: Math.min(baseScore + scoreBoost, 100),
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
      reasoning: error.name === 'AbortError' 
        ? 'Sustainability assessment timed out' 
        : `Unable to generate sustainability assessment: ${error.message || 'Unexpected error'}`
    };
  }
}
