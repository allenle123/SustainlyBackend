# Sustainly Backend

## Overview
Sustainly is a backend service for retrieving product sustainability scores and alternative eco-friendly products.

## Prerequisites
- Node.js 18.x
- AWS CDK CLI
- AWS CLI configured with appropriate credentials

## Setup
1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

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

## Environment Variables
- `DYNAMODB_TABLE`: Name of the DynamoDB table for product data

## Contributing
Please read CONTRIBUTING.md for details on our code of conduct and the process for submitting pull requests.
