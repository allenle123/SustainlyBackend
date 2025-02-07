import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';
import { Duration } from 'aws-cdk-lib';

interface LambdaStackProps extends cdk.StackProps {
  dynamoDBTable: dynamodb.Table;
}

export class LambdaStack extends cdk.Stack {
  public readonly function: lambda.Function;

  constructor(scope: Construct, id: string, props: LambdaStackProps) {
    super(scope, id, props);

    const { dynamoDBTable } = props;

    this.function = new lambda.Function(this, 'SustainlyLambdaFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('dist/lambda'),
      timeout: Duration.seconds(10),
      memorySize: 256,
      environment: {
        DYNAMODB_TABLE: dynamoDBTable.tableName,
        RAINFOREST_API_KEY: 'D86AE03BDF294F65A20C08ED35075FCF'
      }
    });

    dynamoDBTable.grantReadWriteData(this.function);
  }
}
