import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

/** POST /waitlist  { cohortId, studentName } — one entry per parent per cohort. */
export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
  const claims = event.requestContext.authorizer.jwt.claims;
  const userSub = String(claims.sub ?? "");
  const email = String(claims.email ?? "");

  let body: { cohortId?: string; studentName?: string };
  try {
    body = JSON.parse(event.body ?? "{}");
  } catch {
    return json(400, { error: "Request body must be JSON." });
  }
  const cohortId = (body.cohortId ?? "").trim();
  if (!cohortId) return json(400, { error: "cohortId is required." });

  try {
    await ddb.send(
      new PutCommand({
        TableName: process.env.TABLE_NAME!,
        Item: {
          pk: `COHORT#${cohortId}`,
          sk: `WAITLIST#${userSub}`,
          email,
          studentName: (body.studentName ?? "").trim().slice(0, 80),
          createdAt: new Date().toISOString(),
        },
        ConditionExpression: "attribute_not_exists(pk)",
      })
    );
  } catch (err: any) {
    if (err?.name === "ConditionalCheckFailedException") {
      return json(200, { message: "You're already on this waitlist." });
    }
    throw err;
  }
  return json(200, { message: "Added to the waitlist. We'll email you if a seat opens." });
};

function json(statusCode: number, body: unknown): APIGatewayProxyResultV2 {
  return { statusCode, headers: { "content-type": "application/json" }, body: JSON.stringify(body) };
}
