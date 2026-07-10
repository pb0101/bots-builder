import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

/** GET /enrollments — the signed-in parent's enrollments. */
export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
  const userSub = String(event.requestContext.authorizer.jwt.claims.sub ?? "");

  const res = await ddb.send(
    new QueryCommand({
      TableName: process.env.TABLE_NAME!,
      KeyConditionExpression: "pk = :pk AND begins_with(sk, :sk)",
      ExpressionAttributeValues: { ":pk": `USER#${userSub}`, ":sk": "ENROLLMENT#" },
      ScanIndexForward: false,
    })
  );

  const enrollments = (res.Items ?? []).map((i) => ({
    programId: i.programId,
    cohortId: i.cohortId,
    studentName: i.studentName,
    studentAge: i.studentAge,
    createdAt: i.createdAt,
    paymentStatus: i.paymentStatus,
    amountTotal: i.amountTotal,
    currency: i.currency,
  }));

  return {
    statusCode: 200,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ enrollments }),
  };
};
