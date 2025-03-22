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
        allowOrigins: ['http://localhost:8080'],
        allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowHeaders: ['Content-Type', 'Authorization'],
        allowCredentials: true
      }
    });

    // Configure Lambda integration with increased timeout
    const lambdaIntegration = new apigateway.LambdaIntegration(lambdaFunction, {
      timeout: cdk.Duration.millis(29000), // Set to maximum allowed timeout (29 seconds)
      proxy: true
    });

    const productScoreResource = api.root.addResource('product-score');
    productScoreResource.addMethod('GET', lambdaIntegration);

    const alternativeProductsResource = api.root.addResource('alternative-products');
    alternativeProductsResource.addMethod('GET', lambdaIntegration);
  }
}
