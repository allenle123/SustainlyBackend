import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

interface ApiStackProps extends cdk.StackProps {
  lambdaFunction: lambda.Function;
}

export class ApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    const { lambdaFunction } = props;

    const api = new apigateway.RestApi(this, 'SustainlyApi', {
      restApiName: 'Sustainly API',
      description: 'API for Sustainly product sustainability services',
      defaultCorsPreflightOptions: {
        allowOrigins: ['http://localhost:3000'],
        allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowHeaders: ['Content-Type', 'Authorization'],
        allowCredentials: true
      }
    });

    const lambdaIntegration = new apigateway.LambdaIntegration(lambdaFunction);

    const productScoreResource = api.root.addResource('product-score');
    productScoreResource.addMethod('GET', lambdaIntegration);

    const alternativeProductsResource = api.root.addResource('alternative-products');
    alternativeProductsResource.addMethod('GET', lambdaIntegration);
  }
}
