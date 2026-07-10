import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as iam from "aws-cdk-lib/aws-iam";

interface GithubOidcStackProps extends cdk.StackProps {
  /** "owner/repo" allowed to assume the deploy role */
  githubRepo: string;
}

/**
 * Keyless deploys: GitHub Actions assumes this role via OIDC.
 * No long-lived AWS access keys stored in GitHub.
 */
export class GithubOidcStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: GithubOidcStackProps) {
    super(scope, id, props);

    // GitHub OIDC provider ARN - reference the existing one or let CDK create it
    const providerArn = `arn:aws:iam::${this.account}:oidc-provider/token.actions.githubusercontent.com`;

    const role = new iam.Role(this, "DeployRole", {
      roleName: "github-bots-builder-deploy",
      assumedBy: new iam.WebIdentityPrincipal(providerArn, {
        StringEquals: {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
        },
        StringLike: {
          "token.actions.githubusercontent.com:sub": `repo:${props.githubRepo}:ref:refs/heads/main`,
        },
      }),
      maxSessionDuration: cdk.Duration.hours(1),
    });

    // Give the role admin access for CDK deployments
    // In production, you'd want to restrict this further
    role.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName("AdministratorAccess")
    );

    new cdk.CfnOutput(this, "DeployRoleArn", { value: role.roleArn });
  }
}
