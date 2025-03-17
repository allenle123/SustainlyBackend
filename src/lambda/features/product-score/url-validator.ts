export function validateAmazonUrl(url: string): boolean {
  const amazonUrlRegex = /^https:\/\/www\.amazon\.(com|co\.uk|de|fr|ca|jp|in)\/.*\/dp\/[A-Z0-9]+/;
  return amazonUrlRegex.test(url);
}

/**
 * Extracts the Amazon product ID (ASIN) from a valid Amazon URL
 * @param url The Amazon product URL
 * @returns The product ID (ASIN)
 */
export function extractProductIdFromUrl(url: string): string {
  // Check if the URL is valid first
  if (!validateAmazonUrl(url)) {
    throw new Error('Invalid Amazon URL format');
  }
  
  // Extract the ASIN (product ID) using regex
  // The ASIN is typically a 10-character alphanumeric string that follows "/dp/" in the URL
  const asinMatch = url.match(/\/dp\/([A-Z0-9]{10})/);
  
  if (!asinMatch || !asinMatch[1]) {
    throw new Error('Could not extract product ID from URL');
  }
  
  return asinMatch[1];
}
