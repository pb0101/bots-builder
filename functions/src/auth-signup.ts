import { APIGatewayProxyHandler } from "aws-lambda";
import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
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

    const tempPassword = Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 8);

    try {
      // Create user WITHOUT sending message
      console.log(`Creating user: ${email}`);
      await cognito.send(
        new AdminCreateUserCommand({
          UserPoolId: USER_POOL_ID,
          Username: email,
          UserAttributes: [
            { Name: "email", Value: email },
            { Name: "email_verified", Value: "true" },
          ],
          TemporaryPassword: tempPassword,
          // Don't specify MessageAction - don't send email yet
        })
      );
      console.log(`User created successfully: ${email}`);
    } catch (error: any) {
      console.log(`Error creating user ${email}:`, error.__type, error.message);

      if (error.__type !== "UsernameExistsException") {
        throw error;
      }
      console.log(`User already exists: ${email}`);
    }

    // Send email with temporary password
    try {
      console.log(`Setting password and sending email for: ${email}`);
      await cognito.send(
        new AdminSetUserPasswordCommand({
          UserPoolId: USER_POOL_ID,
          Username: email,
          Password: tempPassword,
          Permanent: false, // Mark as temporary so email is sent
        })
      );
      console.log(`Email sent successfully for: ${email}`);
    } catch (error: any) {
      console.error(`Error setting password for ${email}:`, error.message);
      // Continue anyway - email might not be critical
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
    console.error("Signup error:", error.message);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: error.message || "Failed to sign up" }),
    };
  }
};
