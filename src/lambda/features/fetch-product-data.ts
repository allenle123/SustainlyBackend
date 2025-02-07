import axios, { AxiosRequestConfig } from 'axios';

const RAINFOREST_API_KEY = process.env.RAINFOREST_API_KEY || 'D86AE03BDF294F65A20C08ED35075FCF'; // Temporary fallback
const RAINFOREST_BASE_URL = 'https://api.rainforestapi.com';

export async function fetchProductData(url: string) {
  if (!RAINFOREST_API_KEY) {
    throw new Error("Missing Rainforest API Key");
  }

  const params = {
    api_key: RAINFOREST_API_KEY,
    type: 'product',
    url: url,
    output: 'json'
  };

  const axiosConfig: AxiosRequestConfig = {
    method: 'get',
    url: `${RAINFOREST_BASE_URL}/request`,
    params,
    timeout: 15000, // Increased timeout as per previous change
    headers: {
      'User-Agent': 'SustainLy/1.0',
      'Accept': 'application/json'
    }
  };

  const response = await axios.request(axiosConfig);
  
  if (!response.data || !response.data.product) {
    throw new Error("Invalid API response");
  }

  return response.data.product;
}
