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
      
      Sustainability Assessment Guidelines:
      Use the scoring ranges below as your primary guide. When information isn't explicitly stated, make reasonable assumptions based on:
      - Product category and typical industry practices
      - Brand reputation and general sustainability stance
      - Indirect indicators in product descriptions and features
      - Customer reviews and usage experiences
      - Similar products in the market

      **Aspect: Materials** (35 points max)
      Scoring Ranges:
      - 0-8 points: Toxic/harmful/non-renewable materials
        * Evidence of harmful chemicals
        * Non-renewable resource usage
        * No eco-friendly considerations
      
      - 9-17 points: Basic eco-materials
        * Some recycled content
        * Basic natural materials
        * Limited harmful substances
      
      - 18-26 points: Mostly sustainable
        * Significant recycled content
        * Majority eco-friendly materials
        * Low environmental impact
      
      - 27-35 points: Fully sustainable
        * Fully sustainable and renewable
        * Non-toxic materials
        * Biodegradable components
        * Innovative eco-materials

      **Aspect: Manufacturing** (25 points max)
      Scoring Ranges:
      - 0-6 points: High energy/water waste
        * Intensive resource usage
        * Poor waste management
        * High environmental impact
      
      - 7-12 points: Industry standard
        * Standard efficiency measures
        * Basic waste reduction
        * Typical industry practices
      
      - 13-19 points: Efficient, low impact
        * Energy-efficient processes
        * Water conservation
        * Waste reduction programs
      
      - 20-25 points: Renewable energy, zero waste
        * Renewable energy usage
        * Zero-waste practices
        * Innovative production methods

      **Aspect: Lifecycle** (25 points max)
      Scoring Ranges:
      - 0-6 points: <1yr life, non-repairable
        * Short lifespan
        * Disposable design
        * No repair options
      
      - 7-12 points: 2-5yr life, limited repair
        * Average lifespan
        * Basic repairability
        * Some replaceable parts
      
      - 13-19 points: 5-10yr life, repairable
        * Extended lifespan
        * Good repairability
        * Modular components
      
      - 20-25 points: 10yr+ life, fully repairable
        * Exceptional durability
        * Full repairability
        * Upgradeable design

      **Aspect: Certifications** (15 points max)
      Scoring Ranges:
      - 0-3 points: No certifications
        * No eco-certifications
        * No verified claims
        * No standards compliance
      
      - 4-7 points: Basic certifications
        * Basic industry certifications
        * Some verified claims
        * Standard compliance
      
      - 8-11 points: Multiple eco-certs
        * Multiple certifications
        * Strong verification
        * Above standard compliance
      
      - 12-15 points: Highest level certs
        * Premium certifications
        * Full verification
        * Industry-leading standards

      Remember to:
      - Use the scoring ranges as your primary guide
      - Make reasonable assumptions when information is not explicit
      - Consider indirect indicators of sustainability
      - Use industry knowledge to fill information gaps
      - Balance strictness with fairness in scoring

      Output format must follow this exact structure:

      **Aspect: Materials**
      Score: [X/35]
      Reasoning: [Explain which scoring range was selected and why, including both explicit evidence and reasonable inferences]

      ---
      **Aspect: Manufacturing**
      Score: [X/25]
      Reasoning: [Explain which scoring range was selected and why, including both explicit evidence and reasonable inferences]

      ---
      **Aspect: Lifecycle**
      Score: [X/25]
      Reasoning: [Explain which scoring range was selected and why, including both explicit evidence and reasonable inferences]

      ---
      **Aspect: Certifications**
      Score: [X/15]
      Reasoning: [Explain which scoring range was selected and why, including both explicit evidence and reasonable inferences]
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

      // Clear timeout since we got a response
      clearTimeout(timeoutId);

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
        const scoreMatch = aspect.match(/Score:\s*\[?(\d+)\/(\d+)\]?/);
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
