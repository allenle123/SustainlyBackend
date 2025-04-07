import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import { Duration } from 'aws-cdk-lib';

interface ApiStackProps extends cdk.StackProps {
    lambdaFunction: lambda.Function;
}

export class ApiStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: ApiStackProps) {
        super(scope, id, props);

        const { lambdaFunction } = props;

        // Create API with API key requirement
        const api = new apigateway.RestApi(this, 'SustainlyApi', {
            restApiName: 'Sustainly API',
            description: 'API for Sustainly product sustainability services',
            defaultCorsPreflightOptions: {
                allowOrigins: ['http://localhost:8081'],
                allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
                allowHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
                allowCredentials: true,
            },
            apiKeySourceType: apigateway.ApiKeySourceType.HEADER, // API keys must be provided in the header
        });

        // Create API key
        const apiKey = new apigateway.ApiKey(this, 'SustainlyApiKey', {
            apiKeyName: 'SustainlyApiKey',
            description: 'API Key for Sustainly API',
            enabled: true,
        });

        // Create usage plan
        const usagePlan = new apigateway.UsagePlan(this, 'SustainlyUsagePlan', {
            name: 'SustainlyUsagePlan',
            description: 'Usage plan for Sustainly API',
            apiStages: [
                {
                    api,
                    stage: api.deploymentStage,
                },
            ],
            // Set rate limiting
            throttle: {
                rateLimit: 10, // requests per second
                burstLimit: 20, // maximum number of concurrent requests
            },
            // Set quota if needed
            quota: {
                limit: 1000, // number of requests
                period: apigateway.Period.DAY,
            },
        });

        // Add API key to usage plan
        usagePlan.addApiKey(apiKey);

        // Configure Lambda integration with increased timeout
        const lambdaIntegration = new apigateway.LambdaIntegration(lambdaFunction, {
            timeout: Duration.millis(29000), // Set to maximum allowed timeout (29 seconds)
            proxy: true,
        });

        const productScoreResource = api.root.addResource('product-score');
        productScoreResource.addMethod('GET', lambdaIntegration, {
            apiKeyRequired: true, // Require API key for this endpoint
        });

        const alternativeProductsResource = api.root.addResource('alternative-products');
        alternativeProductsResource.addMethod('GET', lambdaIntegration, {
            apiKeyRequired: true, // Require API key for this endpoint
        });

        // Add user history endpoints
        const userHistoryResource = api.root.addResource('user-history');
        userHistoryResource.addMethod('GET', lambdaIntegration, {
            apiKeyRequired: true, // Require API key for this endpoint
        });
        userHistoryResource.addMethod('DELETE', lambdaIntegration, {
            apiKeyRequired: true, // Require API key for this endpoint
        });

        // Output the API key value for reference
        new cdk.CfnOutput(this, 'ApiKeyValue', {
            value: apiKey.keyId,
            description: 'API Key ID (retrieve actual key from AWS Console or CLI)',
            exportName: 'SustainlyApiKeyId',
        });
    }
}
