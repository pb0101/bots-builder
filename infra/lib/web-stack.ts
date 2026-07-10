import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as targets from "aws-cdk-lib/aws-route53-targets";
import * as path from "path";
import * as fs from "fs";

export class WebStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const bucket = new s3.Bucket(this, "SiteBucket", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // Optional custom domain: set DOMAIN_NAME + HOSTED_ZONE_ID + HOSTED_ZONE_NAME.
    const domainName = process.env.DOMAIN_NAME;
    const zoneId = process.env.HOSTED_ZONE_ID;
    const zoneName = process.env.HOSTED_ZONE_NAME;
    let certificate: acm.ICertificate | undefined;
    let zone: route53.IHostedZone | undefined;
    if (domainName && zoneId && zoneName) {
      zone = route53.HostedZone.fromHostedZoneAttributes(this, "Zone", {
        hostedZoneId: zoneId,
        zoneName,
      });
      certificate = new acm.Certificate(this, "SiteCert", {
        domainName,
        subjectAlternativeNames: [`www.${domainName}`],
        validation: acm.CertificateValidation.fromDns(zone),
      });
    }

    const distribution = new cloudfront.Distribution(this, "Distribution", {
      ...(certificate && domainName
        ? { certificate, domainNames: [domainName, `www.${domainName}`] }
        : {}),
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(bucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        compress: true,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      },
      defaultRootObject: "index.html",
      errorResponses: [
        { httpStatus: 403, responsePagePath: "/404.html", responseHttpStatus: 404 },
        { httpStatus: 404, responsePagePath: "/404.html", responseHttpStatus: 404 },
      ],
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
    });

    // Next.js static export output. Guarded so `cdk synth` works pre-build.
    const outDir = path.join(__dirname, "../../web/out");
    if (fs.existsSync(outDir)) {
      new s3deploy.BucketDeployment(this, "DeploySite", {
        sources: [s3deploy.Source.asset(outDir)],
        destinationBucket: bucket,
        distribution,
        distributionPaths: ["/*"],
      });
    }

    if (zone && domainName) {
      new route53.ARecord(this, "AliasRecord", {
        zone,
        recordName: domainName,
        target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(distribution)),
      });
      new route53.ARecord(this, "WwwAliasRecord", {
        zone,
        recordName: `www.${domainName}`,
        target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(distribution)),
      });
    }

    new cdk.CfnOutput(this, "SiteUrl", {
      value: domainName ? `https://${domainName}` : `https://${distribution.domainName}`,
    });
  }
}
