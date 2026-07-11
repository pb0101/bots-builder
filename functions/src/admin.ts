import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  DeleteCommand,
  GetCommand,
  QueryCommand,
  ScanCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import {
  CognitoIdentityProviderClient,
  ListUsersCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { sendEmail } from "./email";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const cognito = new CognitoIdentityProviderClient({});

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

  if (route === "POST /admin/cohorts/delete") {
    let body: any;
    try {
      body = JSON.parse(event.body ?? "{}");
    } catch {
      return json(400, { error: "Request body must be JSON." });
    }
    const cohortId = String(body.cohortId ?? "").trim();
    if (!cohortId) return json(400, { error: "cohortId is required." });

    await ddb.send(
      new DeleteCommand({
        TableName: table,
        Key: { pk: "COHORT", sk: `COHORT#${cohortId}` },
      })
    );
    return json(200, { deleted: cohortId });
  }

  // All enrollments across every cohort (small table; scan is fine).
  if (route === "GET /admin/enrollments") {
    const items: Record<string, any>[] = [];
    let startKey: Record<string, any> | undefined;
    do {
      const res: any = await ddb.send(
        new ScanCommand({
          TableName: table,
          FilterExpression: "begins_with(sk, :e)",
          ExpressionAttributeValues: { ":e": "ENROLLMENT#" },
          ExclusiveStartKey: startKey,
        })
      );
      items.push(...(res.Items ?? []));
      startKey = res.LastEvaluatedKey;
    } while (startKey);

    const enrollments = items
      .map((i) => ({
        cohortId: i.cohortId ?? "",
        programId: i.programId ?? "",
        studentName: i.studentName ?? "",
        studentAge: i.studentAge ?? "",
        parentEmail: i.parentEmail ?? "",
        paymentStatus: i.paymentStatus ?? "",
        amountTotal: i.amountTotal ?? 0,
        createdAt: i.createdAt ?? "",
      }))
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    return json(200, { enrollments });
  }

  // All registered parent accounts from Cognito.
  if (route === "GET /admin/users") {
    const users: any[] = [];
    let token: string | undefined;
    do {
      const res = await cognito.send(
        new ListUsersCommand({
          UserPoolId: process.env.USER_POOL_ID!,
          Limit: 60,
          PaginationToken: token,
        })
      );
      for (const u of res.Users ?? []) {
        const attr = (n: string) => u.Attributes?.find((a) => a.Name === n)?.Value ?? "";
        users.push({
          email: attr("email"),
          name: attr("given_name"),
          status: u.UserStatus ?? "",
          createdAt: u.UserCreateDate ? new Date(u.UserCreateDate).toISOString() : "",
        });
      }
      token = res.PaginationToken;
    } while (token);
    users.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    return json(200, { users });
  }

  // Curriculum documents (instructor manuals etc.) — admin eyes only.
  if (route === "GET /admin/curriculum") {
    const res = await ddb.send(
      new QueryCommand({
        TableName: table,
        KeyConditionExpression: "pk = :pk",
        ExpressionAttributeValues: { ":pk": "CURRICULUM" },
        ProjectionExpression: "id, title, updatedAt",
      })
    );
    const curricula = (res.Items ?? [])
      .map((i) => ({ id: i.id ?? "", title: i.title ?? "", updatedAt: i.updatedAt ?? "" }))
      .sort((a, b) => String(a.title).localeCompare(String(b.title)));
    return json(200, { curricula });
  }

  if (route === "GET /admin/curriculum/item") {
    const id = event.queryStringParameters?.id ?? "";
    if (!id) return json(400, { error: "id query parameter is required." });
    const res = await ddb.send(
      new GetCommand({ TableName: table, Key: { pk: "CURRICULUM", sk: `CURRICULUM#${id}` } })
    );
    if (!res.Item) return json(404, { error: "Curriculum not found." });
    return json(200, {
      id: res.Item.id,
      title: res.Item.title,
      content: res.Item.content,
      updatedAt: res.Item.updatedAt ?? "",
    });
  }

  // ----- hardware inventory -----
  if (route === "GET /admin/inventory") {
    const res = await ddb.send(
      new QueryCommand({
        TableName: table,
        KeyConditionExpression: "pk = :pk",
        ExpressionAttributeValues: { ":pk": "INVENTORY" },
      })
    );
    const items = (res.Items ?? []).map((i) => ({
      id: i.id ?? "",
      name: i.name ?? "",
      phase: i.phase ?? "A",
      category: i.category ?? "",
      vendor: i.vendor ?? "",
      sku: i.sku ?? "",
      quantity: i.quantity ?? 1,
      estCost: i.estCost ?? 0,
      actualCost: i.actualCost ?? null,
      status: i.status ?? "needed",
      notes: i.notes ?? "",
      updatedAt: i.updatedAt ?? "",
    }));
    return json(200, { items });
  }

  if (route === "POST /admin/inventory") {
    let b: any;
    try {
      b = JSON.parse(event.body ?? "{}");
    } catch {
      return json(400, { error: "Request body must be JSON." });
    }
    if (!String(b.name ?? "").trim()) return json(400, { error: "name is required." });
    const id: string = String(b.id ?? "").trim() || `item-${Date.now()}-${Math.floor(Math.random() * 1e4)}`;
    const status = ["needed", "ordered", "received"].includes(b.status) ? b.status : "needed";

    await ddb.send(
      new UpdateCommand({
        TableName: table,
        Key: { pk: "INVENTORY", sk: `ITEM#${id}` },
        UpdateExpression:
          "SET id = :id, #nm = :name, phase = :phase, category = :cat, vendor = :vendor, " +
          "sku = :sku, quantity = :qty, estCost = :est, actualCost = :actual, #st = :status, " +
          "notes = :notes, updatedAt = :now",
        ExpressionAttributeNames: { "#nm": "name", "#st": "status" },
        ExpressionAttributeValues: {
          ":id": id,
          ":name": String(b.name).trim().slice(0, 200),
          ":phase": ["A", "B", "C", "D"].includes(b.phase) ? b.phase : "A",
          ":cat": String(b.category ?? "").trim().slice(0, 80),
          ":vendor": String(b.vendor ?? "").trim().slice(0, 80),
          ":sku": String(b.sku ?? "").trim().slice(0, 60),
          ":qty": Number(b.quantity) || 1,
          ":est": Number(b.estCost) || 0,
          ":actual": b.actualCost === null || b.actualCost === undefined || b.actualCost === ""
            ? null
            : Number(b.actualCost),
          ":status": status,
          ":notes": String(b.notes ?? "").slice(0, 500),
          ":now": new Date().toISOString(),
        },
      })
    );
    return json(200, { id });
  }

  if (route === "POST /admin/inventory/delete") {
    let b: any;
    try {
      b = JSON.parse(event.body ?? "{}");
    } catch {
      return json(400, { error: "Request body must be JSON." });
    }
    const id = String(b.id ?? "").trim();
    if (!id) return json(400, { error: "id is required." });
    await ddb.send(
      new DeleteCommand({ TableName: table, Key: { pk: "INVENTORY", sk: `ITEM#${id}` } })
    );
    return json(200, { deleted: id });
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
