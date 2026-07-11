#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { AuthStack } from "../lib/auth-stack";
import { ApiStack } from "../lib/api-stack";
import { WebStack } from "../lib/web-stack";
import { EmailStack } from "../lib/email-stack";
import { GithubOidcStack } from "../lib/github-oidc-stack";

const app = new cdk.App();
const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION ?? "us-east-1",
};

// Set after the first deploy (the CloudFront domain), or your custom domain.
// Drives Cognito callback URLs, CORS, and Stripe redirect URLs.
const siteUrl = process.env.SITE_URL ?? "http://localhost:3000";

// Globally-unique Cognito hosted-UI domain prefix.
const authDomainPrefix = process.env.AUTH_DOMAIN_PREFIX ?? "bots-builder-auth";

const auth = new AuthStack(app, "BotsBuilderAuth", { env, siteUrl, authDomainPrefix });

new ApiStack(app, "BotsBuilderApi", {
  env,
  siteUrl,
  userPool: auth.userPool,
  userPoolClient: auth.userPoolClient,
});

new WebStack(app, "BotsBuilderWeb", { env });

// Inbound email (support@<domain> -> owner inbox). Needs the custom domain.
if (process.env.DOMAIN_NAME && process.env.HOSTED_ZONE_ID && process.env.HOSTED_ZONE_NAME && process.env.OWNER_EMAIL) {
  new EmailStack(app, "BotsBuilderEmail", {
    env,
    domainName: process.env.DOMAIN_NAME,
    hostedZoneId: process.env.HOSTED_ZONE_ID,
    hostedZoneName: process.env.HOSTED_ZONE_NAME,
    forwardTo: process.env.OWNER_EMAIL,
  });
}

// Deploy this stack once, manually, to create the deploy role for GitHub Actions.
new GithubOidcStack(app, "BotsBuilderGithubOidc", {
  env,
  githubRepo: process.env.GITHUB_REPO ?? "your-github-user/bots-builder",
});
