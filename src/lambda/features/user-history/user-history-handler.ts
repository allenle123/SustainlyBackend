import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getUserIdFromToken, supabase } from '../../utils/supabase-client';
import { getCachedProduct } from '../product-score/product-cache';

import { corsHeaders } from '../../utils/cors-headers';

/**
 * Retrieves a user's history with product details from DynamoDB
 */
export const getUserHistory = async (
    event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
    try {
        // Extract user ID from authorization header
        const authHeader = event.headers?.Authorization || event.headers?.authorization;
        console.log('Auth header:', authHeader);

        const userId = await getUserIdFromToken(authHeader);
        console.log('Extracted user ID:', userId);

        if (!userId) {
            return {
                statusCode: 401,
                headers: corsHeaders,
                body: JSON.stringify({
                    message: 'Unauthorized - valid authentication required',
                }),
            };
        }

        // Get user history from Supabase
        console.log(`Fetching history for user ${userId}`);

        const { data: historyItems, error } = await supabase
            .from('user_history')
            .select('*')
            .eq('user_id', userId)
            .order('updated_at', { ascending: false });

        if (error) {
            console.error('Error fetching user history:', error);
            return {
                statusCode: 500,
                headers: corsHeaders,
                body: JSON.stringify({
                    message: 'Error retrieving user history',
                    error: error.message,
                }),
            };
        }

        // For each history item, get the product data from DynamoDB
        const historyWithProducts = await Promise.all(
            historyItems.map(async (item) => {
                console.log(`Fetching product data for ${item.product_id} from DynamoDB`);
                const productData = await getCachedProduct(item.product_id);

                return {
                    id: item.id,
                    user_id: item.user_id,
                    product_id: item.product_id,
                    product_url: item.product_url,
                    updated_at: item.updated_at,
                    productData: productData
                        ? {
                              productId: productData.productId,
                              title: productData.title,
                              brand: productData.brand || 'Unknown',
                              sustainabilityScore: productData.sustainabilityScore,
                              mainImage: productData.mainImage,
                              aspects: productData.aspects,
                          }
                        : null,
                    isLoading: false,
                };
            })
        );

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify(historyWithProducts),
        };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({
                message: 'Error processing user history request',
                error: errorMessage,
            }),
        };
    }
};

/**
 * Clears a user's history
 */
export const clearUserHistory = async (
    event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
    try {
        // Extract user ID from authorization header
        const authHeader = event.headers?.Authorization || event.headers?.authorization;
        const userId = await getUserIdFromToken(authHeader);

        if (!userId) {
            return {
                statusCode: 401,
                headers: corsHeaders,
                body: JSON.stringify({
                    message: 'Unauthorized - valid authentication required',
                }),
            };
        }

        // Delete all history items for this user
        const { error } = await supabase.from('user_history').delete().eq('user_id', userId);

        if (error) {
            console.error('Error clearing user history:', error);
            return {
                statusCode: 500,
                headers: corsHeaders,
                body: JSON.stringify({
                    message: 'Error clearing user history',
                    error: error.message,
                }),
            };
        }

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                message: 'User history cleared successfully',
            }),
        };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({
                message: 'Error processing clear history request',
                error: errorMessage,
            }),
        };
    }
};
