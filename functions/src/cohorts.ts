import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

/** GET /cohorts — public. Open + full cohorts with seats remaining. */
export const handler = async (
  _event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  const res = await ddb.send(
    new QueryCommand({
      TableName: process.env.TABLE_NAME!,
      KeyConditionExpression: "pk = :pk",
      ExpressionAttributeValues: { ":pk": "COHORT" },
    })
  );

  const today = new Date().toISOString().slice(0, 10);
  const cohorts = (res.Items ?? [])
    .filter((c) => c.status !== "archived" && c.startDate >= today)
    .map((c) => ({
      cohortId: c.cohortId,
      programId: c.programId,
      startDate: c.startDate,
      endDate: c.endDate,
      dayOfWeek: c.dayOfWeek,
      time: c.time,
      location: c.location,
      capacity: c.capacity,
      seatsLeft: Math.max(0, (c.capacity ?? 0) - (c.seatsTaken ?? c.enrolledCount ?? 0)),
      status: c.status ?? "open",
    }))
    .sort((a, b) => a.startDate.localeCompare(b.startDate));

  return {
    statusCode: 200,
    headers: { "content-type": "application/json", "cache-control": "max-age=60" },
    body: JSON.stringify({ cohorts }),
  };
};
