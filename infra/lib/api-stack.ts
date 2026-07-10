import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as apigw from "aws-cdk-lib/aws-apigatewayv2";
import { HttpLambdaIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";
import { HttpJwtAuthorizer } from "aws-cdk-lib/aws-apigatewayv2-authorizers";
import * as iam from "aws-cdk-lib/aws-iam";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as sns from "aws-cdk-lib/aws-sns";
import * as subs from "aws-cdk-lib/aws-sns-subscriptions";
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";
import * as cwActions from "aws-cdk-lib/aws-cloudwatch-actions";
import * as events from "aws-cdk-lib/aws-events";
import * as eventsTargets from "aws-cdk-lib/aws-events-targets";
import * as path from "path";

interface ApiStackProps extends cdk.StackProps {
  siteUrl: string;
  userPool: cognito.IUserPool;
  userPoolClient: cognito.IUserPoolClient;
}

export class ApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    const table = new dynamodb.Table(this, "Enrollments", {
      tableName: "bots-builder-enrollments",
      partitionKey: { name: "pk", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "sk", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });
    // Roster lookups: enrollments by cohort.
    table.addGlobalSecondaryIndex({
      indexName: "gsi1",
      partitionKey: { name: "gsi1pk", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "gsi1sk", type: dynamodb.AttributeType.STRING },
    });

    const fn = (name: string, entry: string) =>
      new NodejsFunction(this, name, {
        entry: path.join(__dirname, `../../functions/src/${entry}`),
        runtime: lambda.Runtime.NODEJS_20_X,
        architecture: lambda.Architecture.ARM_64,
        memorySize: 256,
        timeout: cdk.Duration.seconds(15),
        environment: {
          TABLE_NAME: table.tableName,
          SITE_URL: props.siteUrl,
          STRIPE_SECRET_PARAM: "/bots-builder/stripe/secret-key",
          STRIPE_WEBHOOK_PARAM: "/bots-builder/stripe/webhook-secret",
          STRIPE_PRICES_PARAM: "/bots-builder/stripe/price-map",
          FROM_EMAIL: process.env.FROM_EMAIL ?? "",
          OWNER_EMAIL: process.env.OWNER_EMAIL ?? "",
        },
        bundling: { minify: true, sourcesContent: false },
      });

    const checkoutFn = fn("CreateCheckoutFn", "create-checkout.ts");
    const webhookFn = fn("StripeWebhookFn", "stripe-webhook.ts");
    const enrollmentsFn = fn("EnrollmentsFn", "enrollments.ts");
    const cohortsFn = fn("CohortsFn", "cohorts.ts");
    const waitlistFn = fn("WaitlistFn", "waitlist.ts");
    const adminFn = fn("AdminFn", "admin.ts");
    const contactFn = fn("ContactFn", "contact.ts");
    const authSignupFn = fn("AuthSignupFn", "auth-signup.ts");

    table.grantReadData(checkoutFn);     // cohort capacity check
    table.grantReadWriteData(webhookFn); // enrollment + seat count + cohort read for email
    table.grantWriteData(contactFn);
    table.grantReadData(enrollmentsFn);
    table.grantReadData(cohortsFn);
    table.grantWriteData(waitlistFn);
    table.grantReadWriteData(adminFn);

    const ssmRead = (f: NodejsFunction, params: string[]) =>
      f.addToRolePolicy(
        new iam.PolicyStatement({
          actions: ["ssm:GetParameter"],
          resources: params.map(
            (p) => `arn:aws:ssm:${this.region}:${this.account}:parameter${p}`
          ),
        })
      );
    ssmRead(checkoutFn, ["/bots-builder/stripe/secret-key", "/bots-builder/stripe/price-map"]);
    ssmRead(webhookFn, ["/bots-builder/stripe/secret-key", "/bots-builder/stripe/webhook-secret"]);

    // SES send for transactional email (verify identities first — see README).
    const sesSend = new iam.PolicyStatement({
      actions: ["ses:SendEmail"],
      resources: ["*"],
      conditions: { StringEquals: { "ses:FromAddress": process.env.FROM_EMAIL ?? "unset" } },
    });
    for (const f of [webhookFn, adminFn, contactFn]) f.addToRolePolicy(sesSend);

    // Cognito admin APIs for auth signup
    authSignupFn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          "cognito-idp:AdminCreateUser",
          "cognito-idp:AdminInitiateAuth",
        ],
        resources: [props.userPool.userPoolArn],
      })
    );

    const authorizer = new HttpJwtAuthorizer(
      "CognitoJwt",
      `https://cognito-idp.${this.region}.amazonaws.com/${props.userPool.userPoolId}`,
      { jwtAudience: [props.userPoolClient.userPoolClientId] }
    );

    const api = new apigw.HttpApi(this, "Api", {
      apiName: "bots-builder-api",
      corsPreflight: {
        allowOrigins: [props.siteUrl, "http://localhost:3000"],
        allowMethods: [apigw.CorsHttpMethod.GET, apigw.CorsHttpMethod.POST],
        allowHeaders: ["authorization", "content-type"],
      },
    });

    const add = (
      p: string,
      method: apigw.HttpMethod,
      integration: HttpLambdaIntegration,
      auth = true
    ) =>
      api.addRoutes({
        path: p,
        methods: [method],
        integration,
        ...(auth ? { authorizer } : {}),
      });

    add("/cohorts", apigw.HttpMethod.GET, new HttpLambdaIntegration("CohortsInt", cohortsFn), false);
    add("/checkout", apigw.HttpMethod.POST, new HttpLambdaIntegration("CheckoutInt", checkoutFn));
    add("/enrollments", apigw.HttpMethod.GET, new HttpLambdaIntegration("EnrollInt", enrollmentsFn));
    add("/waitlist", apigw.HttpMethod.POST, new HttpLambdaIntegration("WaitlistInt", waitlistFn));
    add("/admin/cohorts", apigw.HttpMethod.POST, new HttpLambdaIntegration("AdminCohortInt", adminFn));
    add("/admin/roster", apigw.HttpMethod.GET, new HttpLambdaIntegration("AdminRosterInt", adminFn));
    add("/admin/notify-waitlist", apigw.HttpMethod.POST, new HttpLambdaIntegration("AdminNotifyInt", adminFn));
    add("/contact", apigw.HttpMethod.POST, new HttpLambdaIntegration("ContactInt", contactFn), false);
    add("/auth/signup", apigw.HttpMethod.POST, new HttpLambdaIntegration("AuthSignupInt", authSignupFn), false);
    // Stripe calls this: signature-verified in the handler, no JWT.
    add("/webhook", apigw.HttpMethod.POST, new HttpLambdaIntegration("WebhookInt", webhookFn), false);

    // Nightly: reconcile seat counters + send 7-day/1-day reminder emails.
    const dailyOpsFn = fn("DailyOpsFn", "daily-ops.ts");
    table.grantReadWriteData(dailyOpsFn);
    dailyOpsFn.addToRolePolicy(sesSend);
    new events.Rule(this, "DailyOpsRule", {
      schedule: events.Schedule.cron({ minute: "0", hour: "11" }), // 11:00 UTC ≈ 6am Central
      targets: [new eventsTargets.LambdaFunction(dailyOpsFn)],
    });

    // Ops: page the owner if payment processing ever errors.
    if (process.env.OWNER_EMAIL) {
      const topic = new sns.Topic(this, "OpsTopic");
      topic.addSubscription(new subs.EmailSubscription(process.env.OWNER_EMAIL));
      new cloudwatch.Alarm(this, "WebhookErrors", {
        metric: webhookFn.metricErrors({ period: cdk.Duration.minutes(5) }),
        threshold: 1,
        evaluationPeriods: 1,
        alarmDescription: "Stripe webhook Lambda errored — a payment may not be recorded.",
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      }).addAlarmAction(new cwActions.SnsAction(topic));
    }

    new cdk.CfnOutput(this, "ApiUrl", { value: api.apiEndpoint });
  }
}
