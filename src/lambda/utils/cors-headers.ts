// Helper function to determine the correct origin for CORS
export const getCorsHeaders = (requestOrigin?: string) => {
    // For development, always use localhost:8081
    const developmentOrigin = 'http://localhost:8081';
    
    console.log('CORS Headers - Request Origin:', requestOrigin);
    console.log('Always using development origin:', developmentOrigin);
    
    return {
        'Access-Control-Allow-Origin': developmentOrigin,
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
        'Access-Control-Allow-Credentials': 'true',
        'Content-Type': 'application/json',
    };
};

// Default CORS headers (for backward compatibility)
export const corsHeaders = getCorsHeaders();
