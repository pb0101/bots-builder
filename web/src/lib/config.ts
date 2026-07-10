export const config = {
  cognitoAuthority: process.env.NEXT_PUBLIC_COGNITO_AUTHORITY ?? "",
  cognitoClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID ?? "",
  cognitoDomain: process.env.NEXT_PUBLIC_COGNITO_DOMAIN ?? "",
  apiUrl: process.env.NEXT_PUBLIC_API_URL ?? "",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
};
