import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as cognito from "aws-cdk-lib/aws-cognito";

interface AuthStackProps extends cdk.StackProps {
  siteUrl: string;
  authDomainPrefix: string;
}

export class AuthStack extends cdk.Stack {
  readonly userPool: cognito.UserPool;
  readonly userPoolClient: cognito.UserPoolClient;

  constructor(scope: Construct, id: string, props: AuthStackProps) {
    super(scope, id, props);

    this.userPool = new cognito.UserPool(this, "UserPool", {
      userPoolName: "bots-builder-parents",
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      autoVerify: { email: false },
      standardAttributes: {
        givenName: { required: true, mutable: true },
        familyName: { required: false, mutable: true },
      },
      passwordPolicy: {
        minLength: 10,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      deletionProtection: true,
    });

    const callbackUrls = [
      `${props.siteUrl}/dashboard/`,
      "http://localhost:3000/dashboard/",
    ];
    const logoutUrls = [props.siteUrl, "http://localhost:3000"];

    this.userPoolClient = this.userPool.addClient("WebClient", {
      userPoolClientName: "bots-builder-web",
      generateSecret: false, // public SPA client: PKCE, no secret
      authFlows: { userSrp: true, userPassword: true },
      oAuth: {
        flows: { authorizationCodeGrant: true },
        scopes: [
          cognito.OAuthScope.OPENID,
          cognito.OAuthScope.EMAIL,
          cognito.OAuthScope.PROFILE,
        ],
        callbackUrls,
        logoutUrls,
      },
      preventUserExistenceErrors: true,
      accessTokenValidity: cdk.Duration.hours(1),
      idTokenValidity: cdk.Duration.hours(1),
      refreshTokenValidity: cdk.Duration.days(30),
    });

    new cognito.CfnUserPoolGroup(this, "AdminGroup", {
      userPoolId: this.userPool.userPoolId,
      groupName: "admin",
      description: "Bots Builder staff: cohort management and rosters",
    });

    const domain = this.userPool.addDomain("HostedDomain", {
      cognitoDomain: { domainPrefix: props.authDomainPrefix },
    });

    new cdk.CfnOutput(this, "UserPoolId", { value: this.userPool.userPoolId });
    new cdk.CfnOutput(this, "UserPoolClientId", { value: this.userPoolClient.userPoolClientId });
    new cdk.CfnOutput(this, "AuthDomain", { value: domain.baseUrl() });
    new cdk.CfnOutput(this, "OidcAuthority", {
      value: `https://cognito-idp.${this.region}.amazonaws.com/${this.userPool.userPoolId}`,
    });
  }
}
