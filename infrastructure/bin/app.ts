#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { LlmTestingStack } from '../lib/llm-testing-stack';

const app = new cdk.App();

// Get environment from context or use defaults
const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
};

new LlmTestingStack(app, 'LlmTestingStack', {
  env,
  description: 'LLM Testing Framework - Backend API with Bedrock',

  // Stack tags
  tags: {
    Project: 'LLM-Testing-Framework',
    ManagedBy: 'AWS-CDK',
    Environment: process.env.ENVIRONMENT || 'production',
  },
});

app.synth();
