#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { DynamoDBStack } from '../lib/dynamodb-stack';
import { LambdaStack } from '../lib/lambda-stack';
import { ApiStack } from '../lib/api-stack';

const app = new cdk.App();

// Create DynamoDB stack
const dynamoDBStack = new DynamoDBStack(app, 'SustainlyDynamoDBStack', {
  env: { 
    account: process.env.CDK_DEFAULT_ACCOUNT, 
    region: process.env.CDK_DEFAULT_REGION 
  }
});

// Create Lambda stack with DynamoDB table
const lambdaStack = new LambdaStack(app, 'SustainlyLambdaStack', {
  env: { 
    account: process.env.CDK_DEFAULT_ACCOUNT, 
    region: process.env.CDK_DEFAULT_REGION 
  },
  dynamoDBTable: dynamoDBStack.table
});

// Create API Gateway stack
new ApiStack(app, 'SustainlyApiStack', {
  env: { 
    account: process.env.CDK_DEFAULT_ACCOUNT, 
    region: process.env.CDK_DEFAULT_REGION 
  },
  lambdaFunction: lambdaStack.function
});
