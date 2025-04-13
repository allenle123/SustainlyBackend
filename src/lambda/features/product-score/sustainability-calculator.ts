import {
    GoogleGenerativeAI,
    HarmCategory,
    SafetySetting,
    HarmBlockThreshold,
} from '@google/generative-ai';
import { SustainableProductData } from './product-data-fetcher';

// Use environment variables for API key and configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_SEARCH_THRESHOLD = process.env.GEMINI_SEARCH_THRESHOLD
    ? parseFloat(process.env.GEMINI_SEARCH_THRESHOLD)
    : 0.7; // Default to 0.7 if not specified

if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not set in the environment');
}

// Initialize Gemini AI client with API version
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Create model with Google Search retrieval configuration
// Note: Search retrieval only works with Gemini 1.5 models
const model = genAI.getGenerativeModel(
    {
        model: 'gemini-1.5-flash',
        // Use type assertion to tell TypeScript to trust our implementation
        tools: [
            {
                // Use 'as any' to bypass TypeScript type checking for this property
                googleSearchRetrieval: {
                    dynamicRetrievalConfig: {
                        mode: 'MODE_DYNAMIC',
                        dynamicThreshold: GEMINI_SEARCH_THRESHOLD, // Use configurable threshold from environment
                    },
                },
            },
        ] as any,
    },
    { apiVersion: 'v1beta' } // Important: specify the beta API version
);

export interface SustainabilityTip {
    tip: string;
    category: 'usage' | 'maintenance' | 'disposal' | 'general';
}

export interface SustainabilityAssessment {
    score: number;
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
    sustainabilityTips: SustainabilityTip[];
}

export async function calculateSustainabilityScore(
    productData: SustainableProductData
): Promise<SustainabilityAssessment> {
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
                    manufacturing: {
                        score: 0,
                        maxScore: 25,
                        explanation: '',
                        shortExplanation: '',
                    },
                    lifecycle: { score: 0, maxScore: 25, explanation: '', shortExplanation: '' },
                    certifications: {
                        score: 0,
                        maxScore: 15,
                        explanation: '',
                        shortExplanation: '',
                    },
                },
                sustainabilityTips: [],
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
      
      Additional Research Needs:
      - Research ${productData.brand}'s sustainability initiatives and certifications
      - Look for information about the materials used in this product
      - Search for manufacturing processes of this brand or product category
      - Find information about product durability and lifecycle
      
      Sustainability Assessment Guidelines:
      Use the scoring ranges below as your primary guide. When information isn't explicitly stated, search for additional information and make reasonable assumptions based on:
      - Product category and typical industry practices
      - Brand reputation and general sustainability stance
      - Indirect indicators in product features
      - Similar products in the market
      - Concrete data and statistics when available
      
      IMPORTANT SCORING RULES:
      - Do NOT deduct points for unknown or ambiguous information
      - Only deduct points for confirmed negative aspects
      - Give full credit for positive aspects, even if they lack complete verification
      - When information is missing or unclear, assume a neutral stance rather than a negative one
      - Ambiguity about a positive aspect should not be counted as a negative
      - Focus on what is known rather than what is unknown
      - CRITICAL: If something is listed as a positive aspect, DO NOT list it as a negative aspect just because it lacks verification
      - CRITICAL: Never create a negative aspect that references a positive aspect (e.g., don't say "X is not completely verified" if X is listed as a positive)
      - CRITICAL: If the score for any aspect is not a perfect score (not maximum points), you MUST include at least one or two negative factors and/or uncertain factors for that aspect
      - CRITICAL: If the score for an aspect is not in the highest scoring range (Materials: <27, Manufacturing: <20, Lifecycle: <20, Certifications: <12), limit the positive bullet points to a MAXIMUM of 4

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
        * Closed-loop manufacturing (reusing waste materials)
        * Carbon-neutral or carbon-negative operations

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
      - 0 points ONLY: No certifications found
        * IMPORTANT: If no certifications are found, you MUST score this as 0 points, not 1-3 points
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

      WEB SEARCH INSTRUCTIONS:
      You have access to web search capabilities. Please search for the following specific information to enhance your assessment:
      
      1. Search for "[Brand Name] sustainability report" or "[Brand Name] environmental impact" to find sustainability information
      2. Search for "[Product Name] materials composition" to find detailed information about materials used
      3. Search for "[Brand Name] manufacturing process" or "[Brand Name] supply chain transparency" 
      4. Search for "[Brand Name] product lifecycle" or "[Product Name] durability testing"
      5. Search for "[Brand Name] sustainability certifications" or "[Product Name] eco certifications"
      Use the search results to find concrete evidence for your assessment. When using information from web search:
      - DO NOT include any source citations in your response
      - DO NOT include [Source: URL] or any similar format in your bullet points
      - DO NOT include a "Sources Used" section in your response
      - Prioritize recent information (within the last 2 years if possible)
      - Compare multiple sources to verify claims when possible
      - Be specific about which certifications or initiatives you found
      - Present all information as direct statements without any source references
      
      Remember to:
      - Use the scoring ranges as your primary guide
      - Make reasonable assumptions when information is not explicit
      - Consider indirect indicators of sustainability
      - Use industry knowledge to fill information gaps
      - Balance strictness with fairness in scoring
      - Provide concrete data points whenever possible
      - Explain exactly how you calculated the score for each aspect
      - DO NOT include the source of information (e.g., "According to the product description..." or "Based on the feature bullets...")
      - Present all information as direct statements without referencing where it came from
      - IMPORTANT: If the score for any aspect is not a perfect score (not maximum points), you MUST include at least one or two negative factors and/or uncertain factors for that aspect

      Output format must follow this exact structure:

      **Aspect: Materials**
      Score: [X/35]
      Reasoning: 
      [INCLUDE ONLY IF THERE ARE POSITIVE POINTS]
      POSITIVES:
      • [Bullet point of positive factor 1]
      • [Bullet point of positive factor 2]
      [/INCLUDE]
      
      [INCLUDE ONLY IF THERE ARE CONFIRMED NEGATIVE POINTS - NEVER REFERENCE POSITIVES HERE]
      NEGATIVES:
      • [Bullet point of confirmed negative factor 1 - must be a completely separate issue from any positive]
      • [Bullet point of confirmed negative factor 2 - must be a completely separate issue from any positive]
      [/INCLUDE]
      
      [INCLUDE ONLY IF THERE ARE FACTORS THAT CANNOT BE CLASSIFIED AS POSITIVE OR NEGATIVE]
      UNCERTAIN:
      • [Bullet point of uncertain factor 1]
      • [Bullet point of uncertain factor 2]
      [/INCLUDE]
      
      Short Reasoning: [VERY BRIEF 1-2 sentence summary, maximum 150 characters. Focus on key positives and negatives only.]

      ---
      **Aspect: Manufacturing**
      Score: [X/25]
      Reasoning: 
      [INCLUDE ONLY IF THERE ARE POSITIVE POINTS]
      POSITIVES:
      • [Bullet point of positive factor 1]
      • [Bullet point of positive factor 2]
      [/INCLUDE]
      
      [INCLUDE ONLY IF THERE ARE CONFIRMED NEGATIVE POINTS - NEVER REFERENCE POSITIVES HERE]
      NEGATIVES:
      • [Bullet point of confirmed negative factor 1 - must be a completely separate issue from any positive]
      • [Bullet point of confirmed negative factor 2 - must be a completely separate issue from any positive]
      [/INCLUDE]
      
      [INCLUDE ONLY IF THERE ARE FACTORS THAT CANNOT BE CLASSIFIED AS POSITIVE OR NEGATIVE]
      UNCERTAIN:
      • [Bullet point of uncertain factor 1]
      • [Bullet point of uncertain factor 2]
      [/INCLUDE]
      
      Short Reasoning: [VERY BRIEF 1-2 sentence summary, maximum 150 characters. Focus on key positives and negatives only.]

      ---
      **Aspect: Lifecycle**
      Score: [X/25]
      Reasoning: 
      [INCLUDE ONLY IF THERE ARE POSITIVE POINTS]
      POSITIVES:
      • [Bullet point of positive factor 1]
      • [Bullet point of positive factor 2]
      [/INCLUDE]
      
      [INCLUDE ONLY IF THERE ARE CONFIRMED NEGATIVE POINTS - NEVER REFERENCE POSITIVES HERE]
      NEGATIVES:
      • [Bullet point of confirmed negative factor 1 - must be a completely separate issue from any positive]
      • [Bullet point of confirmed negative factor 2 - must be a completely separate issue from any positive]
      [/INCLUDE]
      
      [INCLUDE ONLY IF THERE ARE FACTORS THAT CANNOT BE CLASSIFIED AS POSITIVE OR NEGATIVE]
      UNCERTAIN:
      • [Bullet point of uncertain factor 1]
      • [Bullet point of uncertain factor 2]
      [/INCLUDE]
      
      Short Reasoning: [VERY BRIEF 1-2 sentence summary, maximum 150 characters. Focus on key positives and negatives only.]

      ---
      **Aspect: Certifications**
      Score: [X/15]
      Reasoning: 
      [INCLUDE ONLY IF THERE ARE POSITIVE POINTS]
      POSITIVES:
      • [Bullet point of positive factor 1]
      • [Bullet point of positive factor 2]
      [/INCLUDE]
      
      [INCLUDE ONLY IF THERE ARE CONFIRMED NEGATIVE POINTS - NEVER REFERENCE POSITIVES HERE]
      NEGATIVES:
      • [Bullet point of confirmed negative factor 1 - must be a completely separate issue from any positive]
      • [Bullet point of confirmed negative factor 2 - must be a completely separate issue from any positive]
      [/INCLUDE]
      
      [INCLUDE ONLY IF THERE ARE FACTORS THAT CANNOT BE CLASSIFIED AS POSITIVE OR NEGATIVE]
      UNCERTAIN:
      • [Bullet point of uncertain factor 1]
      • [Bullet point of uncertain factor 2]
      [/INCLUDE]
      
      Short Reasoning: [VERY BRIEF 1-2 sentence summary, maximum 150 characters. Focus on key positives and negatives only.]

      ---
      **Sustainability Tips**
      Please provide 3-5 practical sustainability tips related to this specific product. Include tips for:
      
      1. Usage: How to use the product in a more sustainable way
      2. Maintenance: How to maintain the product to extend its lifespan
      3. Disposal: How to properly dispose of or recycle the product at end-of-life
      4. General: Other sustainability tips related to this product category
      
      Format each tip as follows:
      
      USAGE: [Tip about sustainable usage]
      MAINTENANCE: [Tip about sustainable maintenance]
      DISPOSAL: [Tip about sustainable disposal]
      GENERAL: [General sustainability tip]

      ---
      **Search Information**
      Queries Used: [List all search queries used]
      Sources Used: [List all sources with URLs used to inform this assessment]
    `;

        console.log('Gemini Prompt:', prompt);

        // Call Gemini API with enhanced error handling and timeout
        let result;
        try {
            console.log('Calling Gemini API with Google Search retrieval...');

            // Configure the request
            const generationConfig = {
                maxOutputTokens: 1000,
                temperature: 0.2,
            };

            // Configure safety settings
            const safetySettings = [
                {
                    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
                    threshold: HarmBlockThreshold.BLOCK_NONE,
                },
                {
                    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                    threshold: HarmBlockThreshold.BLOCK_NONE,
                },
            ] as SafetySetting[];

            // Make the API call with standard parameters
            result = await model.generateContent({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig,
                safetySettings,
            });

            // Clear timeout since we got a response
            clearTimeout(timeoutId);

            // Log grounding metadata if available
            // Use type assertion to access groundingMetadata which might not be in the type definitions
            const candidates = (result.response as any).candidates;
            if (candidates?.[0]) {
                try {
                    // Improved metadata extraction with better null handling
                    const groundingMetadata = candidates[0]?.groundingMetadata || {};
                    const retrievalMetadata = groundingMetadata?.retrievalMetadata || {};
                    const dynamicScore = retrievalMetadata?.googleSearchDynamicRetrievalScore;

                    if (dynamicScore !== undefined) {
                        console.log(
                            `Response was grounded with Google Search (score: ${dynamicScore})`
                        );

                        // Check if the score is above the threshold
                        if (dynamicScore >= GEMINI_SEARCH_THRESHOLD) {
                            console.log(
                                `Dynamic retrieval score (${dynamicScore}) is above threshold (${GEMINI_SEARCH_THRESHOLD}), search was used`
                            );
                        } else {
                            console.log(
                                `Dynamic retrieval score (${dynamicScore}) is below threshold (${GEMINI_SEARCH_THRESHOLD}), but search was still used`
                            );
                        }
                    } else {
                        console.log(
                            'Response was grounded with Google Search (no score available)'
                        );
                    }

                    // Check for specific web search queries with improved null handling
                    const webSearchQueries = groundingMetadata?.webSearchQueries || [];
                    if (Array.isArray(webSearchQueries) && webSearchQueries.length > 0) {
                        console.log('Search queries used:', webSearchQueries);
                    } else {
                        console.log(
                            'Search queries used: No specific queries found in response metadata'
                        );
                    }

                    // Check for grounding chunks/sources with improved null handling
                    const groundingChunks = groundingMetadata?.groundingChunks || [];
                    console.log(
                        `Number of grounding sources in metadata: ${Array.isArray(groundingChunks) ? groundingChunks.length : 0}`
                    );

                    // Log the full metadata for reference
                    console.log(
                        'Full grounding metadata structure:',
                        JSON.stringify(groundingMetadata, null, 2)
                    );

                    // Log a more user-friendly interpretation
                    console.log(
                        'Interpretation: The model used web search to enhance its response, but specific search queries and sources may not be included in the API metadata'
                    );
                } catch (error) {
                    console.log('Error accessing grounding metadata details:', error);
                    console.log(
                        'Raw grounding metadata:',
                        JSON.stringify(candidates[0]?.groundingMetadata || {}, null, 2)
                    );
                }
            } else {
                console.log(
                    'Response was generated without Google Search grounding or no candidates returned'
                );
            }

            // Parse the response
            const responseText = result.response.text();
            console.log('Gemini Response:', responseText);

            // Try to extract search information from the response
            try {
                // Extract search queries and sources from the response
                const searchInfoMatch = responseText.match(
                    /\*\*Search Information\*\*([\s\S]*?)(?=\*\*|$)/i
                );
                if (searchInfoMatch && searchInfoMatch[1]) {
                    const searchInfoText = searchInfoMatch[1].trim();
                    console.log('Search Information found in response:', searchInfoText);

                    // Extract queries
                    const queriesMatch = searchInfoText.match(
                        /Queries Used:([\s\S]*?)(?=Sources Used:|$)/i
                    );
                    if (queriesMatch && queriesMatch[1]) {
                        console.log('Search Queries from response:', queriesMatch[1].trim());
                    }

                    // Extract sources
                    const sourcesMatch = searchInfoText.match(/Sources Used:([\s\S]*?)$/i);
                    if (sourcesMatch && sourcesMatch[1]) {
                        console.log('Search Sources from response:', sourcesMatch[1].trim());
                    }
                } else {
                    console.log('No Search Information section found in the response');
                }

                // Enhanced citation detection with multiple formats
                const citationRegexes = [
                    /\[Source: (https?:\/\/[^\]]+)\]/g, // [Source: URL]
                    /\[(https?:\/\/[^\]]+)\]/g, // [URL]
                    /Source: (https?:\/\/[^\s]+)/g, // Source: URL
                ];

                const citations = new Set<string>();
                for (const regex of citationRegexes) {
                    let match;
                    while ((match = regex.exec(responseText)) !== null) {
                        citations.add(match[1]);
                    }
                }

                if (citations.size > 0) {
                    console.log('Citations found in response:', Array.from(citations));
                } else {
                    console.log('No citations found in response');
                }
            } catch (error) {
                console.log('Error extracting search information from response:', error);
            }

            // Initialize category scores and reasoning
            const categories = {
                materials: { maxScore: 35, score: 0, explanation: '', shortExplanation: '' },
                manufacturing: { maxScore: 25, score: 0, explanation: '', shortExplanation: '' },
                lifecycle: { maxScore: 25, score: 0, explanation: '', shortExplanation: '' },
                certifications: { maxScore: 15, score: 0, explanation: '', shortExplanation: '' },
            };

            // Initialize sustainability tips array
            const sustainabilityTips: SustainabilityTip[] = [];

            // Extract scores and reasoning for each aspect
            const aspects = responseText.split('---').filter(Boolean);
            aspects.forEach((aspect) => {
                const aspectName = aspect
                    .match(/\*\*Aspect: ([^*]+)\*\*/i)?.[1]
                    ?.toLowerCase()
                    .trim();
                const scoreMatch = aspect.match(/Score:\s*\[?(\d+)\/(\d+)\]?/);
                const reasoningMatch = aspect.match(/Reasoning:\s*([\s\S]*?)Short Reasoning:/);
                const shortReasoningMatch = aspect.match(/Short Reasoning:\s*([^\n]+)/);

                if (aspectName && scoreMatch && reasoningMatch) {
                    const categoryKey = aspectName
                        .toLowerCase()
                        .replace(/[^a-z]/g, '') as keyof typeof categories;
                    if (categories[categoryKey]) {
                        categories[categoryKey].score = parseInt(scoreMatch[1], 10);

                        // Extract the full reasoning text
                        let fullExplanation = reasoningMatch[1].trim();

                        // Check if there's an UNCERTAIN section and include it in the explanation
                        // but make it clear that these factors were not counted against the score
                        const uncertainMatch = fullExplanation.match(
                            /UNCERTAIN:([\s\S]*?)(?=POSITIVES:|NEGATIVES:|$)/i
                        );
                        // No additional note is added about uncertain factors

                        categories[categoryKey].explanation = fullExplanation;
                        categories[categoryKey].shortExplanation = shortReasoningMatch
                            ? shortReasoningMatch[1].trim()
                            : 'Score based on product analysis.';
                    }
                }

                // Extract sustainability tips
                if (aspect.includes('**Sustainability Tips**')) {
                    // Extract usage tips
                    const usageMatches = aspect.matchAll(/USAGE:\s*([^\n]+)/g);
                    for (const match of usageMatches) {
                        if (match[1]) {
                            sustainabilityTips.push({
                                tip: match[1].trim(),
                                category: 'usage',
                            });
                        }
                    }

                    // Extract maintenance tips
                    const maintenanceMatches = aspect.matchAll(/MAINTENANCE:\s*([^\n]+)/g);
                    for (const match of maintenanceMatches) {
                        if (match[1]) {
                            sustainabilityTips.push({
                                tip: match[1].trim(),
                                category: 'maintenance',
                            });
                        }
                    }

                    // Extract disposal tips
                    const disposalMatches = aspect.matchAll(/DISPOSAL:\s*([^\n]+)/g);
                    for (const match of disposalMatches) {
                        if (match[1]) {
                            sustainabilityTips.push({
                                tip: match[1].trim(),
                                category: 'disposal',
                            });
                        }
                    }

                    // Extract general tips
                    const generalMatches = aspect.matchAll(/GENERAL:\s*([^\n]+)/g);
                    for (const match of generalMatches) {
                        if (match[1]) {
                            sustainabilityTips.push({
                                tip: match[1].trim(),
                                category: 'general',
                            });
                        }
                    }

                    // If no tips were found, add default tips based on product category
                    if (sustainabilityTips.length === 0) {
                        sustainabilityTips.push(
                            {
                                tip: 'Use this product as intended to maximize its lifespan and efficiency.',
                                category: 'usage',
                            },
                            {
                                tip: "Follow the manufacturer's maintenance guidelines to extend the product's life.",
                                category: 'maintenance',
                            },
                            {
                                tip: 'Check local recycling guidelines for proper disposal of this product.',
                                category: 'disposal',
                            },
                            {
                                tip: 'Consider the environmental impact when purchasing similar products in the future.',
                                category: 'general',
                            }
                        );
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
                        shortExplanation: categories.materials.shortExplanation,
                    },
                    manufacturing: {
                        score: categories.manufacturing.score,
                        maxScore: categories.manufacturing.maxScore,
                        explanation: categories.manufacturing.explanation,
                        shortExplanation: categories.manufacturing.shortExplanation,
                    },
                    lifecycle: {
                        score: categories.lifecycle.score,
                        maxScore: categories.lifecycle.maxScore,
                        explanation: categories.lifecycle.explanation,
                        shortExplanation: categories.lifecycle.shortExplanation,
                    },
                    certifications: {
                        score: categories.certifications.score,
                        maxScore: categories.certifications.maxScore,
                        explanation: categories.certifications.explanation,
                        shortExplanation: categories.certifications.shortExplanation,
                    },
                },
                sustainabilityTips,
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
                fullError: JSON.stringify(apiError, Object.getOwnPropertyNames(apiError)),
            });

            // Fallback scoring
            const baseScore = 50;

            return {
                score: baseScore,
                aspects: {
                    materials: { score: 0, maxScore: 35, explanation: '', shortExplanation: '' },
                    manufacturing: {
                        score: 0,
                        maxScore: 25,
                        explanation: '',
                        shortExplanation: '',
                    },
                    lifecycle: { score: 0, maxScore: 25, explanation: '', shortExplanation: '' },
                    certifications: {
                        score: 0,
                        maxScore: 15,
                        explanation: '',
                        shortExplanation: '',
                    },
                },
                sustainabilityTips: [
                    {
                        tip: 'Use this product as intended to maximize its lifespan and efficiency.',
                        category: 'usage',
                    },
                    {
                        tip: "Follow the manufacturer's maintenance guidelines to extend the product's life.",
                        category: 'maintenance',
                    },
                    {
                        tip: 'Check local recycling guidelines for proper disposal of this product.',
                        category: 'disposal',
                    },
                    {
                        tip: 'Consider the environmental impact when purchasing similar products in the future.',
                        category: 'general',
                    },
                ],
            };
        }
    } finally {
        clearTimeout(timeoutId);
    }
}
