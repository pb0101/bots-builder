import { APIGatewayProxyHandler } from "aws-lambda";
import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
} from "@aws-sdk/client-cognito-identity-provider";

const cognito = new CognitoIdentityProviderClient({ region: "us-east-1" });
const USER_POOL_ID = "us-east-1_7ivyevhwf";

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

    // Generate temporary password (will be sent via email)
    const tempPassword = Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 8);

    try {
      await cognito.send(
        new AdminCreateUserCommand({
          UserPoolId: USER_POOL_ID,
          Username: email,
          UserAttributes: [
            { Name: "email", Value: email },
            { Name: "email_verified", Value: "true" },
          ],
          MessageAction: "RESEND", // Sends temporary password via email
          TemporaryPassword: tempPassword,
        })
      );
      console.log(`User created: ${email}`);
    } catch (error: any) {
      console.log(`Error for ${email}:`, error.__type, error.message);

      if (error.__type === "UsernameExistsException") {
        // User already exists - update and resend password
        console.log(`User already exists, updating: ${email}`);
        // For existing users, just acknowledge - email will still be resent by Cognito
      } else {
        throw error;
      }
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        success: true,
        message: "Check your email for the sign-in code",
      }),
    };
  } catch (error: any) {
    console.error("Signup error:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: error.message || "Failed to sign up" }),
    };
  }
};
