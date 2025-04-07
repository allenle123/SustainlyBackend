# Sustainly Backend

## Overview
Sustainly is a backend service for retrieving product sustainability scores and alternative eco-friendly products. It uses Google's Gemini AI with web search capabilities to provide accurate and up-to-date sustainability information.

## Prerequisites
- Node.js 18.x
- AWS CDK CLI
- AWS CLI configured with appropriate credentials
- Google Cloud Project with Gemini API enabled (for web search capabilities)

## Setup
1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file based on `.env.example` and fill in your API keys and configuration

## Local Development
- Run TypeScript compilation: `npm run build`
- Start local development server: `npm run start`

## Deployment
Deploy all stacks:
```bash
# Option 1: Using existing script
./scripts/deploy.sh

# Option 2: Using pnpm full-deploy script
pnpm full-deploy
```

The `full-deploy` script combines pre-deployment tasks (cleaning and bundling) with CDK deployment, making the process more streamlined.

## Project Structure
- `lambda/`: AWS Lambda function code
- `cdk/`: AWS CDK infrastructure definitions
- `dynamodb/`: DynamoDB seed data
- `scripts/`: Deployment and utility scripts

## Features
- Product Sustainability Score Retrieval
- Alternative Product Recommendations
- Web-Enhanced Sustainability Assessment (using Gemini web search)
- User History Tracking (via Supabase)

## Environment Variables
- `DYNAMODB_TABLE`: Name of the DynamoDB table for product data
- `GEMINI_API_KEY`: API key for Google's Gemini AI (required for web search)
- `API_KEYS`: Comma-separated list of valid API keys for API authentication

## API Authentication

The API is now private and requires an API key for access. All endpoints are protected and require the API key to be included in the request headers.

### Using the API Key

To access the API endpoints, include the API key in the `x-api-key` header of your requests:

```
Headers:
  x-api-key: YOUR_API_KEY
```

### Obtaining an API Key

After deploying the application, you can obtain the API key ID from the CloudFormation outputs. The actual API key value can be retrieved from the AWS Console or using the AWS CLI:

```bash
aws apigateway get-api-key --api-key YOUR_API_KEY_ID --include-value
```
- `PROJECT_ID`: Google Cloud Project ID
- `SUPABASE_URL`: URL for your Supabase project
- `SUPABASE_SERVICE_KEY`: Service key for Supabase authentication
- `USE_MOCK_DATA`: Set to 'true' to use mock data instead of real API calls

## Web Search Enhancement
Sustainly leverages Gemini's web search capabilities to find up-to-date information about products and brands. The sustainability calculator:

1. Analyzes product data
2. Dynamically searches the web for relevant sustainability information about the product and brand
3. Provides comprehensive scoring across four sustainability aspects: Materials, Manufacturing, Lifecycle, and Certifications

### Web Search Implementation Details

The application uses Google's Gemini 1.5 Flash model with Google Search retrieval to enhance sustainability assessments. Key implementation details:

- **Dynamic Retrieval**: The system uses a threshold-based approach (set to 0.7) to determine when web search is necessary. This balances between using the model's existing knowledge and retrieving fresh information from the web.

- **API Requirements**: 
  - Requires a Google Cloud Project with billing enabled
  - Uses the v1beta API version
  - Compatible with Gemini 1.5 models (not Gemini 2.0)

- **Search Focus Areas**:
  - Brand sustainability initiatives and certifications
  - Materials used in products and their environmental impact
  - Manufacturing processes and supply chain transparency
  - Product lifecycle, durability, and repairability

- **Response Enhancement**:
  - When web search is used, the response includes grounding metadata
  - Sources are tracked and logged for transparency
  - The system automatically determines which queries to use for search

### Enabling Web Search

To enable web search functionality:

1. Create a Google Cloud Project and enable billing
2. Enable the Generative Language API in your project
3. Create an API key with access to Gemini 1.5 models
4. Set the `GEMINI_API_KEY` and `PROJECT_ID` in your `.env` file
5. Ensure you're using `@google/generative-ai` version 0.3.0 or higher

Note: Web search functionality incurs additional costs beyond the standard Gemini API usage.

## Code Quality with Biome

This project uses [Biome](https://biomejs.dev/) for linting, formatting, and code quality checks. Biome is a fast, modern JavaScript/TypeScript toolchain that replaces ESLint, Prettier, and other tools with a single, unified solution.

### Biome Configuration

The project's Biome configuration is defined in `biome.json` with the following key features:

- **Linting**: Enabled with recommended rules and some customizations:
  - Disabled rules: `noUnusedVariables`, `useConst`, `noNegationElse`, `noExplicitAny`
  - Ignored directories: `dist`, `node_modules`, `cdk.out`, `build`

- **Formatting**: Configured with:
  - Space indentation (4 spaces)
  - 100 character line width
  - Single quotes for JavaScript
  - Always use semicolons
  - ES5 trailing commas

- **Import Organization**: Automatically organizes imports

### Available Commands

The following npm scripts are available for code quality management:

```bash
# Lint your code
pnpm run lint

# Lint and automatically fix issues
pnpm run lint:fix

# Format your code
pnpm run format

# Format and write changes
pnpm run format:fix

# Run all checks (linting and formatting)
pnpm run check

# Run all checks and fix issues
pnpm run check:fix
```

### Development Workflow

For the best development experience:

1. Run `npm run check:fix` before committing changes to ensure code quality
2. Configure your IDE to use Biome (many editors have Biome extensions available)
3. The `.biome/` directory is gitignored to prevent committing cache files

## Contributing
Please read CONTRIBUTING.md for details on our code of conduct and the process for submitting pull requests.
