import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as ses from "aws-cdk-lib/aws-ses";
import * as sesActions from "aws-cdk-lib/aws-ses-actions";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as iam from "aws-cdk-lib/aws-iam";
import * as route53 from "aws-cdk-lib/aws-route53";
import { AwsCustomResource, AwsCustomResourcePolicy, PhysicalResourceId } from "aws-cdk-lib/custom-resources";
import * as path from "path";

interface EmailStackProps extends cdk.StackProps {
  domainName: string;      // botsbuilderkids.com
  hostedZoneId: string;
  hostedZoneName: string;
  forwardTo: string;       // inbox that receives forwarded mail
}

/**
 * Inbound email for support@<domain>: SES receives, stores in S3,
 * and a Lambda forwards to the owner's inbox.
 */
export class EmailStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: EmailStackProps) {
    super(scope, id, props);

    const zone = route53.HostedZone.fromHostedZoneAttributes(this, "Zone", {
      hostedZoneId: props.hostedZoneId,
      zoneName: props.hostedZoneName,
    });

    // Route inbound mail for the domain to SES.
    new route53.MxRecord(this, "InboundMx", {
      zone,
      values: [{ priority: 10, hostName: `inbound-smtp.${this.region}.amazonaws.com` }],
    });

    // Transient storage for raw messages (forwarded within seconds).
    const mailBucket = new s3.Bucket(this, "InboundMail", {
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      lifecycleRules: [{ expiration: cdk.Duration.days(30) }],
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const supportAddr = `support@${props.domainName}`;

    const forwarder = new NodejsFunction(this, "ForwarderFn", {
      entry: path.join(__dirname, "../../functions/src/email-forward.ts"),
      runtime: lambda.Runtime.NODEJS_20_X,
      architecture: lambda.Architecture.ARM_64,
      memorySize: 256,
      timeout: cdk.Duration.seconds(30),
      environment: {
        BUCKET: mailBucket.bucketName,
        PREFIX: "inbound/",
        FORWARD_TO: props.forwardTo,
        FROM_ADDR: supportAddr,
      },
      bundling: { minify: true, sourcesContent: false },
    });
    mailBucket.grantRead(forwarder);
    forwarder.addToRolePolicy(
      new iam.PolicyStatement({ actions: ["ses:SendRawEmail"], resources: ["*"] })
    );

    const ruleSet = new ses.ReceiptRuleSet(this, "RuleSet", {
      receiptRuleSetName: "bots-builder-inbound",
    });
    ruleSet.addRule("SupportForward", {
      recipients: [supportAddr],
      scanEnabled: true,
      actions: [
        new sesActions.S3({ bucket: mailBucket, objectKeyPrefix: "inbound/" }),
        new sesActions.Lambda({ function: forwarder }),
      ],
    });

    // Only one rule set can be active per account/region; CloudFormation has
    // no activation resource, so flip it with a custom resource.
    new AwsCustomResource(this, "ActivateRuleSet", {
      onCreate: {
        service: "SES",
        action: "setActiveReceiptRuleSet",
        parameters: { RuleSetName: ruleSet.receiptRuleSetName },
        physicalResourceId: PhysicalResourceId.of("bots-builder-active-rule-set"),
      },
      onUpdate: {
        service: "SES",
        action: "setActiveReceiptRuleSet",
        parameters: { RuleSetName: ruleSet.receiptRuleSetName },
        physicalResourceId: PhysicalResourceId.of("bots-builder-active-rule-set"),
      },
      onDelete: {
        service: "SES",
        action: "setActiveReceiptRuleSet",
        parameters: {}, // deactivate on stack teardown
      },
      policy: AwsCustomResourcePolicy.fromSdkCalls({
        resources: AwsCustomResourcePolicy.ANY_RESOURCE,
      }),
    });

    new cdk.CfnOutput(this, "SupportAddress", { value: supportAddr });
    new cdk.CfnOutput(this, "ForwardsTo", { value: props.forwardTo });
  }
}
