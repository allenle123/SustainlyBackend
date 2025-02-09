export function validateAmazonUrl(url: string): boolean {
  const amazonUrlRegex = /^https:\/\/www\.amazon\.(com|co\.uk|de|fr|ca|jp|in)\/.*\/dp\/[A-Z0-9]+/;
  return amazonUrlRegex.test(url);
}
