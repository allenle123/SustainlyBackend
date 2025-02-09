import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';

export class DynamoDBStack extends cdk.Stack {
  public readonly table: dynamodb.Table;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create DynamoDB table
    this.table = new dynamodb.Table(this, 'SustainlyProductsTable', {
      tableName: 'SustainlyProductsTable',
      partitionKey: { 
        name: 'productId', 
        type: dynamodb.AttributeType.STRING 
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      
      // Point-in-time recovery specification
      pointInTimeRecovery: true,
      
      // Time to live attribute
      timeToLiveAttribute: 'ttl'
    });

    // Optional: Add Global Secondary Index
    this.table.addGlobalSecondaryIndex({
      indexName: 'BrandIndex',
      partitionKey: { 
        name: 'brand', 
        type: dynamodb.AttributeType.STRING 
      }
    });

    // Output the table name for reference
    new cdk.CfnOutput(this, 'TableName', {
      value: this.table.tableName,
      description: 'DynamoDB Table Name'
    });
  }
}
