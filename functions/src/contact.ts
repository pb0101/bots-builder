import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { sendEmail } from "./email";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

/** POST /contact — public lead capture with a honeypot field. */
export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  let body: { name?: string; email?: string; message?: string; website?: string };
  try {
    body = JSON.parse(event.body ?? "{}");
  } catch {
    return json(400, { error: "Request body must be JSON." });
  }

  // Honeypot: real users never fill "website". Pretend success for bots.
  if (body.website) return json(200, { message: "Thanks — we'll be in touch." });

  const name = (body.name ?? "").trim().slice(0, 100);
  const email = (body.email ?? "").trim().slice(0, 200);
  const message = (body.message ?? "").trim().slice(0, 2000);
  if (!name || !email.includes("@") || !message) {
    return json(400, { error: "Name, a valid email, and a message are required." });
  }

  const now = new Date().toISOString();
  await ddb.send(
    new PutCommand({
      TableName: process.env.TABLE_NAME!,
      Item: { pk: "LEAD", sk: `LEAD#${now}#${email}`, name, email, message, createdAt: now },
    })
  );

  const owner = process.env.OWNER_EMAIL;
  if (owner) {
    await sendEmail([owner], `Website inquiry from ${name}`, `${name} <${email}>\n\n${message}`);
  }
  return json(200, { message: "Thanks — we'll reply within one business day." });
};

function json(statusCode: number, body: unknown): APIGatewayProxyResultV2 {
  return { statusCode, headers: { "content-type": "application/json" }, body: JSON.stringify(body) };
}
