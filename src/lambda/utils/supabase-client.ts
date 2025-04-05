import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
    console.warn('Missing Supabase environment variables. User history will not be saved.');
} else {
    console.log('Supabase client initialized with URL:', supabaseUrl);
}

export const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Save a product to user history
 * @param userId The user's ID
 * @param productId Product ID
 * @param productUrl Amazon product URL
 */
export const saveToUserHistory = async (
    userId: string,
    productId: string,
    productUrl: string
): Promise<void> => {
    try {
        console.log(`Attempting to save product to history for user ${userId}`);
        console.log('Product details:', { productId, productUrl });

        // Use upsert to handle both insert and update in one operation
        console.log('Upserting history entry');
        const { data, error } = await supabase.from('user_history').upsert(
            {
                user_id: userId,
                product_id: productId,
                product_url: productUrl,
                updated_at: new Date().toISOString(),
            },
            {
                onConflict: 'user_id,product_id',
                ignoreDuplicates: false,
            }
        );

        if (error) {
            console.error('Error upserting history entry:', error);
        } else {
            console.log('Successfully upserted history entry:', data);
        }
    } catch (error) {
        console.error('Failed to save user history:', error);
        // Don't throw error to avoid disrupting the main flow
    }
};

/**
 * Extract user ID from JWT token
 * @param authHeader Authorization header with Bearer token
 * @returns User ID or null if not authenticated
 */
export const getUserIdFromToken = async (authHeader?: string): Promise<string | null> => {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.log('No valid authorization header found');
        return null;
    }

    try {
        const token = authHeader.replace('Bearer ', '');
        console.log('Attempting to verify token');

        const { data, error } = await supabase.auth.getUser(token);

        if (error || !data.user) {
            console.error('Error verifying token:', error);
            return null;
        }

        console.log('Successfully verified user from token:', data.user.id);
        return data.user.id;
    } catch (error) {
        console.error('Failed to extract user ID from token:', error);
        return null;
    }
};
