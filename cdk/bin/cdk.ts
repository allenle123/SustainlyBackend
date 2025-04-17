#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { DynamoDBStack } from '../lib/dynamodb-stack';
import { LambdaStack } from '../lib/lambda-stack';
import { ApiStack } from '../lib/api-stack';

const app = new cdk.App();

// Create DynamoDB stack
const dynamoDBStack = new DynamoDBStack(app, 'Sustainly-Dev-DynamoDBStack', {
    env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION,
    },
});

// Create Lambda stack with DynamoDB table
const lambdaStack = new LambdaStack(app, 'Sustainly-Dev-LambdaStack', {
    env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION,
    },
    dynamoDBTable: dynamoDBStack.table,
});

// Create API Gateway stack for development
new ApiStack(app, 'Sustainly-Dev-ApiStack', {
    env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION,
    },
    lambdaFunction: lambdaStack.function, // Development Lambda
});
