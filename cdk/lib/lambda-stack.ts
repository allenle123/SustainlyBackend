import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(__dirname, '../..', '.env') });

interface LambdaStackProps extends cdk.StackProps {
  dynamoDBTable: dynamodb.Table;
}

export class LambdaStack extends cdk.Stack {
  public readonly function: lambda.Function;

  constructor(scope: Construct, id: string, props: LambdaStackProps) {
    super(scope, id, props);

    // Validate environment variables
    const requiredEnvVars = ['RAINFOREST_API_KEY', 'GEMINI_API_KEY'];
    requiredEnvVars.forEach(varName => {
      if (!process.env[varName]) {
        throw new Error(`Missing required environment variable: ${varName}`);
      }
    });

    // Create the Lambda function
    this.function = new lambda.Function(this, 'SustainlyLambdaFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('dist/lambda'),
      environment: {
        DYNAMODB_TABLE: props.dynamoDBTable.tableName,
        RAINFOREST_API_KEY: process.env.RAINFOREST_API_KEY || '',
        GEMINI_API_KEY: process.env.GEMINI_API_KEY || ''
      },
      memorySize: 256,
      timeout: cdk.Duration.seconds(30)
    });

    // Grant the Lambda function read/write permissions to the DynamoDB table
    props.dynamoDBTable.grantReadWriteData(this.function);
  }
}
