// Helper function to determine the correct origin for CORS
export const getCorsHeaders = (requestOrigin?: string) => {
    // List of allowed origins (without trailing slashes to match browser behavior)
    const allowedOrigins = ['https://sustainly-six.vercel.app', 'http://localhost:8081', 'https://www.sustainly.fyi'];
    
    // Default origin (first in the list) if request origin is not in allowed list
    let origin = allowedOrigins[0];
    
    // If the request origin is in our allowed list, use it
    if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
        origin = requestOrigin;
    }
    
    return {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
        'Access-Control-Allow-Credentials': 'true',
        'Content-Type': 'application/json',
    };
};

// Default CORS headers (for backward compatibility)
export const corsHeaders = getCorsHeaders();
