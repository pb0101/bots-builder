import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import Stripe from "stripe";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { getParam } from "./ssm";
import { sendEmail } from "./email";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

/**
 * POST /webhook — Stripe only. Signature-verified.
 * Records the enrollment (idempotent), takes a seat, marks the cohort
 * full at capacity, and sends confirmation emails (best-effort).
 */
export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  const signature = event.headers["stripe-signature"];
  if (!signature || !event.body) return { statusCode: 400, body: "Missing signature" };

  const stripe = new Stripe(await getParam(process.env.STRIPE_SECRET_PARAM!));
  const webhookSecret = await getParam(process.env.STRIPE_WEBHOOK_PARAM!);
  const payload = event.isBase64Encoded
    ? Buffer.from(event.body, "base64").toString("utf8")
    : event.body;

  let stripeEvent: Stripe.Event;
  try {
    stripeEvent = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (err) {
    console.error("Signature verification failed", err);
    return { statusCode: 400, body: "Invalid signature" };
  }

  if (stripeEvent.type === "checkout.session.completed") {
    const s = stripeEvent.data.object as Stripe.Checkout.Session;
    const userSub = s.metadata?.userSub ?? s.client_reference_id ?? "unknown";
    const cohortId = s.metadata?.cohortId ?? "unknown";
    const studentName = s.metadata?.studentName ?? "";
    const parentEmail = s.customer_details?.email ?? "";
    const table = process.env.TABLE_NAME!;

    // 1) Enrollment record — conditional put makes Stripe retries no-ops.
    let isNew = true;
    try {
      await ddb.send(
        new PutCommand({
          TableName: table,
          Item: {
            pk: `USER#${userSub}`,
            sk: `ENROLLMENT#${s.id}`,
            gsi1pk: `COHORT#${cohortId}`,
            gsi1sk: `ENROLLMENT#${s.id}`,
            programId: s.metadata?.programId ?? "unknown",
            cohortId,
            studentName,
            studentAge: s.metadata?.studentAge ?? "",
            waiverAccepted: s.metadata?.waiverAccepted === "true",
            email: parentEmail,
            amountTotal: s.amount_total,
            currency: s.currency,
            paymentStatus: s.payment_status,
            stripeSessionId: s.id,
            createdAt: new Date().toISOString(),
          },
          ConditionExpression: "attribute_not_exists(pk)",
        })
      );
    } catch (err: any) {
      if (err?.name === "ConditionalCheckFailedException") isNew = false;
      else throw err;
    }

    if (isNew && cohortId !== "unknown") {
      // 2) The hold from checkout becomes a paid seat: seatsTaken already
      // counts it, so only the paid counter moves here.
      await ddb.send(
        new UpdateCommand({
          TableName: table,
          Key: { pk: "COHORT", sk: `COHORT#${cohortId}` },
          UpdateExpression: "ADD enrolledCount :one",
          ExpressionAttributeValues: { ":one": 1 },
        })
      );
      try {
        await ddb.send(
          new UpdateCommand({
            TableName: table,
            Key: { pk: "COHORT", sk: `COHORT#${cohortId}` },
            UpdateExpression: "SET #st = :full",
            ConditionExpression: "enrolledCount >= #cap",
            ExpressionAttributeNames: { "#st": "status", "#cap": "capacity" },
            ExpressionAttributeValues: { ":full": "full" },
          })
        );
      } catch (err: any) {
        if (err?.name !== "ConditionalCheckFailedException") throw err; // not full yet
      }

      // 3) Emails (best-effort; sandbox rules apply until SES production access).
      const cohortRes = await ddb.send(
        new GetCommand({ TableName: table, Key: { pk: "COHORT", sk: `COHORT#${cohortId}` } })
      );
      const c = cohortRes.Item;
      const when = c
        ? `${c.dayOfWeek}s at ${c.time}, ${c.startDate} to ${c.endDate}, at ${c.location}`
        : "your selected cohort";

      if (parentEmail) {
        await sendEmail(
          [parentEmail],
          `You're in! ${studentName}'s robotics seat is confirmed`,
          [
            `Hi,`,
            ``,
            `${studentName}'s seat is confirmed: ${when}.`,
            ``,
            `What to expect: drop off 5 minutes early on day one. Everything is provided — robots, tablets, and materials stay with us. The last 10 minutes of every class is a showcase; you're welcome at pickup. The final session is Demo Day, built for families.`,
            ``,
            `Questions any time: just reply to this email.`,
            ``,
            `— Bots Builder, Frisco TX`,
          ].join("\n")
        );
      }
      const owner = process.env.OWNER_EMAIL;
      if (owner) {
        await sendEmail(
          [owner],
          `New enrollment: ${studentName} → ${cohortId}`,
          `Student: ${studentName} (age ${s.metadata?.studentAge ?? "?"})\nParent: ${parentEmail}\nCohort: ${cohortId}\nPaid: ${(s.amount_total ?? 0) / 100} ${s.currency}\nSeats now: ${c ? `${c.enrolledCount}/${c.capacity}` : "?"}`
        );
      }
    }
  }

  // Abandoned checkout: release the seat hold taken at session creation.
  if (stripeEvent.type === "checkout.session.expired") {
    const s = stripeEvent.data.object as Stripe.Checkout.Session;
    const cohortId = s.metadata?.cohortId;
    if (cohortId) {
      await ddb.send(
        new UpdateCommand({
          TableName: process.env.TABLE_NAME!,
          Key: { pk: "COHORT", sk: `COHORT#${cohortId}` },
          UpdateExpression: "ADD seatsTaken :minus",
          ExpressionAttributeValues: { ":minus": -1 },
        })
      );
    }
  }

  return { statusCode: 200, body: "ok" };
};
