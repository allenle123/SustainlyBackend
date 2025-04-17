import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';

export class DynamoDBStack extends cdk.Stack {
    public readonly table: dynamodb.Table;

    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        this.table = new dynamodb.Table(this, 'SustainabilityProductsTable', {
            tableName: 'SustainabilityScores-Dev',
            partitionKey: {
                name: 'productId',
                type: dynamodb.AttributeType.STRING,
            },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            timeToLiveAttribute: 'ttl', // Enable TTL using the ttl attribute
        });

        // Explicitly prevent CloudFormation exports
        this.suppressExports();
    }

    // Method to suppress CloudFormation exports
    private suppressExports(): void {
        const cfnTable = this.table.node.defaultChild as dynamodb.CfnTable;
        cfnTable.cfnOptions.metadata = {
            ...cfnTable.cfnOptions.metadata,
            'aws:cdk:path-metadata': false,
        };
    }
}
