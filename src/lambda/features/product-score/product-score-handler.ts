import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { validateAmazonUrl } from './url-validator';
import { fetchProductData } from './product-data-fetcher';
import { calculateSustainabilityScore, SustainabilityTip } from './sustainability-calculator';
import { getCachedProduct, cacheProductData } from './product-cache';
import { getUserIdFromToken, saveToUserHistory } from '../../utils/supabase-client';

import { getCorsHeaders } from '../../utils/cors-headers';

export const getProductScore = async (
    event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
    try {
        const url = event.queryStringParameters?.url;

        // Log headers to debug authentication issues
        console.log('Request headers:', JSON.stringify(event.headers));
        
        // Get the request origin from the headers
        const requestOrigin = event.headers?.origin || event.headers?.Origin;

        if (!url || typeof url !== 'string' || !validateAmazonUrl(url)) {
            return {
                statusCode: 400,
                headers: getCorsHeaders(requestOrigin),
                body: JSON.stringify({
                    message: 'Invalid Amazon product URL',
                    details: {
                        urlType: typeof url,
                        urlValue: url,
                        fullQueryParams: event.queryStringParameters,
                    },
                }),
            };
        }

        try {
            // Extract user ID from authorization header if present
            const authHeader = event.headers?.Authorization || event.headers?.authorization;
            console.log('Auth header:', authHeader);

            const userId = await getUserIdFromToken(authHeader);
            console.log('Extracted user ID:', userId);

            // First fetch the product data to get the product ID
            const productData = await fetchProductData(url);

            // Check if we have a cached result
            const cachedProduct = await getCachedProduct(productData.productId);

            let score: number;
            let aspects: {
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
            let sustainabilityTips: SustainabilityTip[] = [];

            if (cachedProduct) {
                // Use cached data
                console.log('Using cached product data for:', productData.productId);
                score = cachedProduct.sustainabilityScore;
                aspects = cachedProduct.aspects;
                sustainabilityTips = cachedProduct.sustainabilityTips || [];
            } else {
                // Calculate new score
                console.log('Calculating new sustainability score for:', productData.productId);
                const assessment = await calculateSustainabilityScore(productData);
                score = assessment.score;
                aspects = assessment.aspects;
                sustainabilityTips = assessment.sustainabilityTips;

                // Cache the results
                await cacheProductData(
                    productData.productId,
                    productData.title,
                    productData.mainImage,
                    assessment,
                    productData.brand,
                    productData.categories
                );
            }

            // If user is authenticated, save to their history
            if (userId) {
                console.log(
                    `Saving product ${productData.productId} to history for user ${userId}`
                );
                await saveToUserHistory(userId, productData.productId, url);
            } else {
                console.log('No user ID found, skipping history save');
            }

            return {
                statusCode: 200,
                headers: getCorsHeaders(requestOrigin),
                body: JSON.stringify({
                    productId: productData.productId,
                    title: productData.title,
                    brand: productData.brand,
                    sustainabilityScore: score,
                    mainImage: productData.mainImage,
                    categories: productData.categories,
                    aspects,
                    sustainabilityTips,
                }),
            };
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';

            return {
                statusCode: 500,
                headers: getCorsHeaders(requestOrigin),
                body: JSON.stringify({
                    message: 'Error processing product data',
                    error: errorMessage,
                    sustainabilityScore: 50,
                    sustainabilityAttributes: {
                        brand: 'Unknown',
                        categories: [],
                        sustainabilityKeywords: [],
                        materialFeatures: [],
                    },
                    sustainabilityReasoning: 'Unable to generate sustainability assessment',
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
                }),
            };
        }
    } catch (topLevelError: unknown) {
        const errorMessage =
            topLevelError instanceof Error ? topLevelError.message : 'Unknown error';

        // Get the request origin from the headers, even in the catch block
        const requestOrigin = event.headers?.origin || event.headers?.Origin;
        console.log('Error occurred. Request origin:', requestOrigin);
        
        return {
            statusCode: 500,
            headers: getCorsHeaders(requestOrigin),
            body: JSON.stringify({
                message: 'Critical error processing request',
                error: errorMessage,
                sustainabilityScore: 50,
                sustainabilityAttributes: {
                    brand: 'Unknown',
                    categories: [],
                    sustainabilityKeywords: [],
                    materialFeatures: [],
                },
                sustainabilityReasoning: 'Unable to generate sustainability assessment',
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
            }),
        };
    }
};
