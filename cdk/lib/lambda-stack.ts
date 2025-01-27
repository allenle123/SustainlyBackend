import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';
import * as path from 'path';

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
      code: lambda.Code.fromAsset(path.join(__dirname, '..', '..', 'dist', 'src', 'lambda'), {
        exclude: [
          '**/*.ts',
          '**/*.d.ts',
          '**/*.map',
          'node_modules',
          'package-lock.json', 
          'package.json',
          '.gitignore',
          'tsconfig.json'
        ]
      }),
      environment: {
        DYNAMODB_TABLE: dynamoDBTable.tableName
      }
    });

    dynamoDBTable.grantReadWriteData(this.function);
  }
}
