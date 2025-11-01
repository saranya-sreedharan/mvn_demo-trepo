#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { EcsCicdStack } from '../lib/ecs-cicd-stack';

const app = new cdk.App();
new EcsCicdStack(app, 'EcsCicdStack', {
  env: { account: '047750374992', region: 'eu-north-1' }
});
