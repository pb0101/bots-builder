import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";

const ses = new SESv2Client({});

/**
 * Best-effort email: never throws, so a mail hiccup can't fail
 * a webhook or an API request. Logs failures for CloudWatch.
 */
export async function sendEmail(to: string[], subject: string, body: string): Promise<void> {
  const from = process.env.FROM_EMAIL;
  if (!from || to.length === 0) return;
  try {
    await ses.send(
      new SendEmailCommand({
        FromEmailAddress: from,
        Destination: { ToAddresses: to },
        Content: {
          Simple: {
            Subject: { Data: subject },
            Body: { Text: { Data: body } },
          },
        },
      })
    );
  } catch (err) {
    console.error("Email send failed", { to, subject, err });
  }
}
