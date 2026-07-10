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

    // Reference existing GitHub OIDC provider (created manually before first deploy)
    const provider = iam.OpenIdConnectProvider.fromOpenIdConnectProviderArn(
      this,
      "GithubProvider",
      `arn:aws:iam::${this.account}:oidc-provider/token.actions.githubusercontent.com`
    );

    // Reference existing role (created manually with correct trust policy)
    const role = iam.Role.fromRoleArn(
      this,
      "DeployRole",
      `arn:aws:iam::${this.account}:role/github-bots-builder-deploy`,
      { mutable: true }
    );

    // Ensure the role has admin access for CDK deployments
    role.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName("AdministratorAccess")
    );

    new cdk.CfnOutput(this, "DeployRoleArn", { value: role.roleArn });
  }
}
