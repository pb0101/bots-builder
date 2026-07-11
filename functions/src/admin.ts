import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { sendEmail } from "./email";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

/**
 * Admin-only (Cognito group "admin"):
 *   POST /admin/cohorts        create or update a cohort
 *   GET  /admin/roster?cohortId=...   enrollments + waitlist for a cohort
 */
export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
  const claims = event.requestContext.authorizer.jwt.claims;
  // Group claim arrives stringified, e.g. "[admin]"
  const groups = String(claims["cognito:groups"] ?? "");
  if (!groups.includes("admin")) {
    return json(403, { error: "Admin access required." });
  }

  const table = process.env.TABLE_NAME!;
  const route = `${event.requestContext.http.method} ${event.rawPath}`;

  if (route === "POST /admin/cohorts") {
    let c: any;
    try {
      c = JSON.parse(event.body ?? "{}");
    } catch {
      return json(400, { error: "Request body must be JSON." });
    }
    const required = ["programId", "startDate", "endDate", "dayOfWeek", "time", "location", "capacity"];
    for (const f of required) if (!c[f]) return json(400, { error: `${f} is required.` });

    const cohortId: string = c.cohortId?.trim() || `${c.programId}-${c.startDate}`;
    // Upsert that never clobbers seat counters on edits.
    await ddb.send(
      new UpdateCommand({
        TableName: table,
        Key: { pk: "COHORT", sk: `COHORT#${cohortId}` },
        UpdateExpression:
          "SET cohortId = :id, programId = :prog, startDate = :sd, endDate = :ed, " +
          "dayOfWeek = :dow, #tm = :tm, #loc = :loc, #cap = :cap, #st = :status, " +
          "enrolledCount = if_not_exists(enrolledCount, :zero), " +
          "seatsTaken = if_not_exists(seatsTaken, :zero), updatedAt = :now",
        ExpressionAttributeNames: {
          "#tm": "time",
          "#loc": "location",
          "#st": "status",
          "#cap": "capacity", // "capacity" is a DynamoDB reserved keyword
        },
        ExpressionAttributeValues: {
          ":id": cohortId,
          ":prog": c.programId,
          ":sd": c.startDate,
          ":ed": c.endDate,
          ":dow": c.dayOfWeek,
          ":tm": c.time,
          ":loc": c.location,
          ":cap": Number(c.capacity),
          ":status": c.status ?? "open",
          ":zero": 0,
          ":now": new Date().toISOString(),
        },
      })
    );
    return json(200, { cohortId });
  }

  if (route === "GET /admin/roster") {
    const cohortId = event.queryStringParameters?.cohortId ?? "";
    if (!cohortId) return json(400, { error: "cohortId query parameter is required." });

    const [enrollRes, waitRes] = await Promise.all([
      ddb.send(
        new QueryCommand({
          TableName: table,
          IndexName: "gsi1",
          KeyConditionExpression: "gsi1pk = :pk",
          ExpressionAttributeValues: { ":pk": `COHORT#${cohortId}` },
        })
      ),
      ddb.send(
        new QueryCommand({
          TableName: table,
          KeyConditionExpression: "pk = :pk AND begins_with(sk, :sk)",
          ExpressionAttributeValues: { ":pk": `COHORT#${cohortId}`, ":sk": "WAITLIST#" },
        })
      ),
    ]);

    return json(200, {
      roster: (enrollRes.Items ?? []).map((i) => ({
        studentName: i.studentName,
        studentAge: i.studentAge,
        parentEmail: i.email,
        paymentStatus: i.paymentStatus,
        createdAt: i.createdAt,
      })),
      waitlist: (waitRes.Items ?? []).map((i) => ({
        studentName: i.studentName,
        parentEmail: i.email,
        createdAt: i.createdAt,
      })),
    });
  }

  if (route === "POST /admin/notify-waitlist") {
    let b: any;
    try { b = JSON.parse(event.body ?? "{}"); } catch { return json(400, { error: "Request body must be JSON." }); }
    const cohortId = (b.cohortId ?? "").trim();
    if (!cohortId) return json(400, { error: "cohortId is required." });

    const waitRes = await ddb.send(
      new QueryCommand({
        TableName: table,
        KeyConditionExpression: "pk = :pk AND begins_with(sk, :sk)",
        ExpressionAttributeValues: { ":pk": `COHORT#${cohortId}`, ":sk": "WAITLIST#" },
      })
    );
    const entries = (waitRes.Items ?? []).filter((w) => w.email);
    const siteUrl = process.env.SITE_URL ?? "";
    await Promise.all(
      entries.map((w) =>
        sendEmail(
          [w.email],
          "A robotics seat just opened up",
          `Good news — a seat opened in the cohort you waitlisted (${cohortId}).\n\nSeats go to whoever enrolls first: ${siteUrl}/schedule/\n\n— Bots Builder, Frisco TX`
        )
      )
    );
    return json(200, { notified: entries.length });
  }

  return json(404, { error: "Unknown admin route." });
};

function json(statusCode: number, body: unknown): APIGatewayProxyResultV2 {
  return { statusCode, headers: { "content-type": "application/json" }, body: JSON.stringify(body) };
}
