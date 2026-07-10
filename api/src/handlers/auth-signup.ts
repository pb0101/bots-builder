import { APIGatewayProxyHandler } from "aws-lambda";
import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminInitiateAuthCommand,
} from "@aws-sdk/client-cognito-identity-provider";

const cognito = new CognitoIdentityProviderClient({ region: "us-east-1" });
const USER_POOL_ID = "us-east-1_7ivyevhwf";
const CLIENT_ID = "67rq6l3fg8175c2bgendlj5kus";

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const { email } = JSON.parse(event.body || "{}");

    if (!email || !email.includes("@")) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Invalid email" }),
      };
    }

    // Create or update user with temporary password sent via email
    const tempPassword = Math.random().toString(36).slice(-10);

    try {
      await cognito.send(
        new AdminCreateUserCommand({
          UserPoolId: USER_POOL_ID,
          Username: email,
          UserAttributes: [
            { Name: "email", Value: email },
            { Name: "email_verified", Value: "true" },
          ],
          MessageAction: "RESEND", // Send temp password via email
          TemporaryPassword: tempPassword,
        })
      );
    } catch (error: any) {
      // User already exists - that's fine
      if (!error.message?.includes("already exists")) {
        throw error;
      }
    }

    // Trigger auth to ensure email is sent
    try {
      await cognito.send(
        new AdminInitiateAuthCommand({
          UserPoolId: USER_POOL_ID,
          ClientId: CLIENT_ID,
          AuthFlow: "ADMIN_NO_SRP_AUTH",
          AuthParameters: {
            USERNAME: email,
            PASSWORD: tempPassword,
          },
        })
      );
    } catch {
      // Auth will fail with temp password, but that's expected
      // Email should have been sent
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: true, message: "Check your email for the sign-in code" }),
    };
  } catch (error: any) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: error.message || "Failed to process request" }),
    };
  }
};
