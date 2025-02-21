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
  aspects: {
    materials: { score: number; maxScore: number; explanation: string };
    manufacturing: { score: number; maxScore: number; explanation: string };
    lifecycle: { score: number; maxScore: number; explanation: string };
    certifications: { score: number; maxScore: number; explanation: string };
  };
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
        aspects: {
          materials: { score: 0, maxScore: 35, explanation: '' },
          manufacturing: { score: 0, maxScore: 25, explanation: '' },
          lifecycle: { score: 0, maxScore: 25, explanation: '' },
          certifications: { score: 0, maxScore: 15, explanation: '' }
        }
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
      Evaluate the sustainability of this product by scoring and providing reasoning for each of the following aspects:

      **Aspect: Materials** (35 points max)
      Consider:
      - Use of recycled content
      - Renewable materials
      - Material toxicity
      - Biodegradability

      **Aspect: Manufacturing** (25 points max)
      Consider:
      - Energy efficiency
      - Water usage
      - Carbon footprint
      - Waste management

      **Aspect: Lifecycle** (25 points max)
      Consider:
      - Product durability
      - Repairability
      - End-of-life recyclability
      - Expected lifespan

      **Aspect: Certifications** (15 points max)
      Consider:
      - Environmental certifications
      - Industry standards compliance
      - Third-party verification

      Output format must follow this exact structure:

      **Aspect: Materials**
      Score: [X/35]
      Reasoning: [Brief explanation]

      ---
      **Aspect: Manufacturing**
      Score: [X/25]
      Reasoning: [Brief explanation]

      ---
      **Aspect: Lifecycle**
      Score: [X/25]
      Reasoning: [Brief explanation]

      ---
      **Aspect: Certifications**
      Score: [X/15]
      Reasoning: [Brief explanation]
      ---
    `;

    console.log('Gemini Prompt:', prompt);

    // Call Gemini API with enhanced error handling and timeout
    let result;
    try {
      result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: 1000,
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
        aspects: {
          materials: { score: 0, maxScore: 35, explanation: '' },
          manufacturing: { score: 0, maxScore: 25, explanation: '' },
          lifecycle: { score: 0, maxScore: 25, explanation: '' },
          certifications: { score: 0, maxScore: 15, explanation: '' }
        }
      };
    } finally {
      // Ensure timeout is cleared
      clearTimeout(timeoutId);
    }

    // Parse the response
    const responseText = result.response.text();
    console.log('Gemini Response:', responseText);
    
    // Initialize category scores and reasoning
    const categories = {
      materials: { maxScore: 35, score: 0, explanation: '' },
      manufacturing: { maxScore: 25, score: 0, explanation: '' },
      lifecycle: { maxScore: 25, score: 0, explanation: '' },
      certifications: { maxScore: 15, score: 0, explanation: '' }
    };

    // Extract scores and reasoning for each aspect
    const aspects = responseText.split('---').filter(Boolean);
    aspects.forEach(aspect => {
      const aspectName = aspect.match(/\*\*Aspect: ([^*]+)\*\*/i)?.[1]?.toLowerCase().trim();
      const scoreMatch = aspect.match(/Score:\s*(\d+)\/(\d+)/);
      const reasoningMatch = aspect.match(/Reasoning:\s*([^\n]+)/);

      if (aspectName && scoreMatch && reasoningMatch) {
        const categoryKey = aspectName.toLowerCase().replace(/[^a-z]/g, '') as keyof typeof categories;
        if (categories[categoryKey]) {
          categories[categoryKey].score = parseInt(scoreMatch[1], 10);
          categories[categoryKey].explanation = reasoningMatch[1].trim();
        }
      }
    });

    // Calculate total score
    const totalScore = Object.values(categories).reduce((sum, cat) => sum + cat.score, 0);

    return {
      score: totalScore,
      aspects: {
        materials: { 
          score: categories.materials.score,
          maxScore: categories.materials.maxScore,
          explanation: categories.materials.explanation
        },
        manufacturing: {
          score: categories.manufacturing.score,
          maxScore: categories.manufacturing.maxScore,
          explanation: categories.manufacturing.explanation
        },
        lifecycle: {
          score: categories.lifecycle.score,
          maxScore: categories.lifecycle.maxScore,
          explanation: categories.lifecycle.explanation
        },
        certifications: {
          score: categories.certifications.score,
          maxScore: categories.certifications.maxScore,
          explanation: categories.certifications.explanation
        }
      }
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
      aspects: {
        materials: { score: 0, maxScore: 35, explanation: '' },
        manufacturing: { score: 0, maxScore: 25, explanation: '' },
        lifecycle: { score: 0, maxScore: 25, explanation: '' },
        certifications: { score: 0, maxScore: 15, explanation: '' }
      }
    };
  }
}
