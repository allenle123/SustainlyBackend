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
    materials: { score: number; maxScore: number; explanation: string; shortExplanation: string };
    manufacturing: { score: number; maxScore: number; explanation: string; shortExplanation: string };
    lifecycle: { score: number; maxScore: number; explanation: string; shortExplanation: string };
    certifications: { score: number; maxScore: number; explanation: string; shortExplanation: string };
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
          materials: { score: 0, maxScore: 35, explanation: '', shortExplanation: '' },
          manufacturing: { score: 0, maxScore: 25, explanation: '', shortExplanation: '' },
          lifecycle: { score: 0, maxScore: 25, explanation: '', shortExplanation: '' },
          certifications: { score: 0, maxScore: 15, explanation: '', shortExplanation: '' }
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
      
      Feature Highlights:
      ${productData.featureBullets.map((bullet, index) => `${index + 1}. ${bullet}`).join('\n')}
      
      Sustainability Assessment Guidelines:
      Use the scoring ranges below as your primary guide. When information isn't explicitly stated, make reasonable assumptions based on:
      - Product category and typical industry practices
      - Brand reputation and general sustainability stance
      - Indirect indicators in product features
      - Similar products in the market
      - Concrete data and statistics when available

      **Aspect: Materials** (35 points max)
      Scoring Ranges:
      - 0-8 points: Toxic/harmful/non-renewable materials
        * Evidence of harmful chemicals (e.g., PVC, BPA, phthalates)
        * Non-renewable resource usage (e.g., virgin petroleum-based plastics)
        * No eco-friendly considerations
      
      - 9-17 points: Basic eco-materials
        * Some recycled content (10-30%)
        * Basic natural materials (cotton, wood without certifications)
        * Limited harmful substances (meets minimum regulatory requirements)
      
      - 18-26 points: Mostly sustainable
        * Significant recycled content (31-70%)
        * Majority eco-friendly materials (certified organic, FSC wood)
        * Low environmental impact (water-based finishes, natural dyes)
      
      - 27-35 points: Fully sustainable
        * Fully sustainable and renewable (71-100% recycled or renewable)
        * Non-toxic materials (zero VOCs, formaldehyde-free)
        * Biodegradable components (compostable materials)
        * Innovative eco-materials (mycelium, algae-based, reclaimed)

      **Aspect: Manufacturing** (25 points max)
      Scoring Ranges:
      - 0-6 points: High energy/water waste
        * Intensive resource usage (high carbon footprint >10kg CO2e per unit)
        * Poor waste management (no recycling programs)
        * High environmental impact (toxic discharge, excessive water usage >100L per unit)
      
      - 7-12 points: Industry standard
        * Standard efficiency measures (meets industry average carbon footprint)
        * Basic waste reduction (some recycling, <50% waste diverted from landfill)
        * Typical industry practices (some energy efficiency measures)
      
      - 13-19 points: Efficient, low impact
        * Energy-efficient processes (30-70% reduction in energy use vs. industry standard)
        * Water conservation (30-70% reduction in water use)
        * Waste reduction programs (50-90% waste diverted from landfill)
      
      - 20-25 points: Renewable energy, zero waste
        * Renewable energy usage (>70% renewable energy in production)
        * Zero-waste practices (>90% waste diverted from landfill)
        * Innovative production methods (closed-loop systems, carbon-negative processes)

      **Aspect: Lifecycle** (25 points max)
      Scoring Ranges:
      - 0-6 points: <1yr life, non-repairable
        * Short lifespan (<1 year typical use)
        * Disposable design (single-use or limited uses)
        * No repair options (sealed units, proprietary parts)
      
      - 7-12 points: 2-5yr life, limited repair
        * Average lifespan (2-5 years typical use)
        * Basic repairability (some parts replaceable)
        * Some replaceable parts (batteries, filters)
      
      - 13-19 points: 5-10yr life, repairable
        * Extended lifespan (5-10 years typical use)
        * Good repairability (most parts replaceable)
        * Modular components (easy disassembly, standard parts)
      
      - 20-25 points: 10yr+ life, fully repairable
        * Exceptional durability (10+ years typical use)
        * Full repairability (all parts replaceable, repair manual available)
        * Upgradeable design (modular, future-proof)

      **Aspect: Certifications** (15 points max)
      Scoring Ranges:
      - 0-3 points: No certifications
        * No eco-certifications (no third-party verification)
        * No verified claims (self-declared "green" claims only)
        * No standards compliance (below minimum industry standards)
      
      - 4-7 points: Basic certifications
        * Basic industry certifications (single certification like Energy Star)
        * Some verified claims (partial third-party verification)
        * Standard compliance (meets minimum industry standards)
      
      - 8-11 points: Multiple eco-certs
        * Multiple certifications (2-3 recognized certifications)
        * Strong verification (comprehensive third-party verification)
        * Above standard compliance (exceeds industry standards)
      
      - 12-15 points: Highest level certs
        * Premium certifications (B Corp, Cradle to Cradle Gold/Platinum)
        * Full verification (comprehensive documentation and transparency)
        * Industry-leading standards (sets new benchmarks in the industry)

      Remember to:
      - Use the scoring ranges as your primary guide
      - Make reasonable assumptions when information is not explicit
      - Consider indirect indicators of sustainability
      - Use industry knowledge to fill information gaps
      - Balance strictness with fairness in scoring
      - Provide concrete data points whenever possible
      - Explain exactly how you calculated the score for each aspect

      Output format must follow this exact structure:

      **Aspect: Materials**
      Score: [X/35]
      Reasoning: [Detailed explanation of which scoring range was selected and why, including both explicit evidence and reasonable inferences]
      Short Reasoning: [Brief 1-2 sentence summary of key factors affecting the score]

      ---
      **Aspect: Manufacturing**
      Score: [X/25]
      Reasoning: [Detailed explanation of which scoring range was selected and why, including both explicit evidence and reasonable inferences]
      Short Reasoning: [Brief 1-2 sentence summary of key factors affecting the score]

      ---
      **Aspect: Lifecycle**
      Score: [X/25]
      Reasoning: [Detailed explanation of which scoring range was selected and why, including both explicit evidence and reasonable inferences]
      Short Reasoning: [Brief 1-2 sentence summary of key factors affecting the score]

      ---
      **Aspect: Certifications**
      Score: [X/15]
      Reasoning: [Detailed explanation of which scoring range was selected and why, including both explicit evidence and reasonable inferences]
      Short Reasoning: [Brief 1-2 sentence summary of key factors affecting the score]
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
        materials: { maxScore: 35, score: 0, explanation: '', shortExplanation: '' },
        manufacturing: { maxScore: 25, score: 0, explanation: '', shortExplanation: '' },
        lifecycle: { maxScore: 25, score: 0, explanation: '', shortExplanation: '' },
        certifications: { maxScore: 15, score: 0, explanation: '', shortExplanation: '' }
      };

      // Extract scores and reasoning for each aspect
      const aspects = responseText.split('---').filter(Boolean);
      aspects.forEach(aspect => {
        const aspectName = aspect.match(/\*\*Aspect: ([^*]+)\*\*/i)?.[1]?.toLowerCase().trim();
        const scoreMatch = aspect.match(/Score:\s*\[?(\d+)\/(\d+)\]?/);
        const reasoningMatch = aspect.match(/Reasoning:\s*([^\n]+)/);
        const shortReasoningMatch = aspect.match(/Short Reasoning:\s*([^\n]+)/);

        if (aspectName && scoreMatch && reasoningMatch) {
          const categoryKey = aspectName.toLowerCase().replace(/[^a-z]/g, '') as keyof typeof categories;
          if (categories[categoryKey]) {
            categories[categoryKey].score = parseInt(scoreMatch[1], 10);
            categories[categoryKey].explanation = reasoningMatch[1].trim();
            categories[categoryKey].shortExplanation = shortReasoningMatch ? shortReasoningMatch[1].trim() : reasoningMatch[1].trim().substring(0, 100) + '...';
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
            explanation: categories.materials.explanation,
            shortExplanation: categories.materials.shortExplanation
          },
          manufacturing: {
            score: categories.manufacturing.score,
            maxScore: categories.manufacturing.maxScore,
            explanation: categories.manufacturing.explanation,
            shortExplanation: categories.manufacturing.shortExplanation
          },
          lifecycle: {
            score: categories.lifecycle.score,
            maxScore: categories.lifecycle.maxScore,
            explanation: categories.lifecycle.explanation,
            shortExplanation: categories.lifecycle.shortExplanation
          },
          certifications: {
            score: categories.certifications.score,
            maxScore: categories.certifications.maxScore,
            explanation: categories.certifications.explanation,
            shortExplanation: categories.certifications.shortExplanation
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

      return {
        score: baseScore,
        aspects: {
          materials: { score: 0, maxScore: 35, explanation: '', shortExplanation: '' },
          manufacturing: { score: 0, maxScore: 25, explanation: '', shortExplanation: '' },
          lifecycle: { score: 0, maxScore: 25, explanation: '', shortExplanation: '' },
          certifications: { score: 0, maxScore: 15, explanation: '', shortExplanation: '' }
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
        materials: { score: 0, maxScore: 35, explanation: '', shortExplanation: '' },
        manufacturing: { score: 0, maxScore: 25, explanation: '', shortExplanation: '' },
        lifecycle: { score: 0, maxScore: 25, explanation: '', shortExplanation: '' },
        certifications: { score: 0, maxScore: 15, explanation: '', shortExplanation: '' }
      }
    };
  }
}
