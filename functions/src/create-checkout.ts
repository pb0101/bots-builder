import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from "aws-lambda";
import Stripe from "stripe";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { getParam } from "./ssm";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

/**
 * POST /checkout  { cohortId, studentName, studentAge, waiverAccepted }
 * Seat accounting: `seatsTaken` counts paid seats AND live checkout holds.
 * We atomically take a hold here (condition: seatsTaken < capacity), then the
 * Stripe session either completes (webhook keeps the seat) or expires within
 * 30 minutes (webhook releases it). No two parents can buy the last seat.
 */
export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
  const claims = event.requestContext.authorizer.jwt.claims;
  const userSub = String(claims.sub ?? "");
  const email = String(claims.email ?? "");

  let body: { cohortId?: string; studentName?: string; studentAge?: string; waiverAccepted?: boolean };
  try {
    body = JSON.parse(event.body ?? "{}");
  } catch {
    return json(400, { error: "Request body must be JSON." });
  }
  const cohortId = (body.cohortId ?? "").trim();
  const studentName = (body.studentName ?? "").trim().slice(0, 80);
  const studentAge = (body.studentAge ?? "").trim().slice(0, 3);
  if (!cohortId || !studentName || !studentAge) {
    return json(400, { error: "cohortId, studentName, and studentAge are required." });
  }
  if (body.waiverAccepted !== true) {
    return json(400, { error: "Please accept the participation and photo policy to continue." });
  }

  const table = process.env.TABLE_NAME!;
  const key = { pk: "COHORT", sk: `COHORT#${cohortId}` };

  const cohortRes = await ddb.send(new GetCommand({ TableName: table, Key: key }));
  const cohort = cohortRes.Item;
  if (!cohort) return json(404, { error: "That cohort no longer exists." });

  // Take the hold atomically.
  try {
    await ddb.send(
      new UpdateCommand({
        TableName: table,
        Key: key,
        UpdateExpression: "ADD seatsTaken :one",
        ConditionExpression: "#st = :open AND (attribute_not_exists(seatsTaken) OR seatsTaken < capacity)",
        ExpressionAttributeNames: { "#st": "status" },
        ExpressionAttributeValues: { ":one": 1, ":open": "open" },
      })
    );
  } catch (err: any) {
    if (err?.name === "ConditionalCheckFailedException") {
      return json(409, { error: "This cohort just filled up. Join the waitlist instead." });
    }
    throw err;
  }

  const releaseHold = () =>
    ddb
      .send(
        new UpdateCommand({
          TableName: table,
          Key: key,
          UpdateExpression: "ADD seatsTaken :minus",
          ExpressionAttributeValues: { ":minus": -1 },
        })
      )
      .catch((e) => console.error("Hold release failed", e));

  try {
    const priceMap: Record<string, string> = JSON.parse(
      await getParam(process.env.STRIPE_PRICES_PARAM!)
    );
    const price = priceMap[cohort.programId];
    if (!price) {
      await releaseHold();
      return json(500, { error: "This program isn't configured for checkout yet." });
    }

    const stripe = new Stripe(await getParam(process.env.STRIPE_SECRET_PARAM!));
    const siteUrl = process.env.SITE_URL!;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price, quantity: 1 }],
      customer_email: email || undefined,
      client_reference_id: userSub,
      metadata: { userSub, programId: cohort.programId, cohortId, studentName, studentAge, waiverAccepted: "true" },
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // holds live 30 min max
      success_url: `${siteUrl}/dashboard/?enrolled=${encodeURIComponent(cohort.programId)}`,
      cancel_url: `${siteUrl}/schedule/`,
      allow_promotion_codes: true,
    });

    return json(200, { url: session.url });
  } catch (err) {
    await releaseHold();
    throw err;
  }
};

function json(statusCode: number, body: unknown): APIGatewayProxyResultV2 {
  return { statusCode, headers: { "content-type": "application/json" }, body: JSON.stringify(body) };
}
