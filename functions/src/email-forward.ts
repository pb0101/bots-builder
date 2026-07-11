import type { SESEvent } from "aws-lambda";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { SESClient, SendRawEmailCommand } from "@aws-sdk/client-ses";

const s3 = new S3Client({});
const ses = new SESClient({});

/**
 * Forwards inbound mail (stored in S3 by the SES receipt rule) to FORWARD_TO.
 * SES requires the envelope-From to be a verified identity, so we rewrite
 * From: to our own address and preserve the original sender in Reply-To.
 */
export const handler = async (event: SESEvent) => {
  const bucket = process.env.BUCKET!;
  const prefix = process.env.PREFIX ?? "";
  const forwardTo = process.env.FORWARD_TO!;
  const fromAddr = process.env.FROM_ADDR!;

  for (const record of event.Records) {
    const messageId = record.ses.mail.messageId;
    const obj = await s3.send(
      new GetObjectCommand({ Bucket: bucket, Key: `${prefix}${messageId}` })
    );
    const raw = await obj.Body!.transformToString();

    // Split header block from body.
    const sep = raw.indexOf("\r\n\r\n") !== -1 ? "\r\n\r\n" : "\n\n";
    const splitAt = raw.indexOf(sep);
    const headerBlock = splitAt === -1 ? raw : raw.slice(0, splitAt);
    const body = splitAt === -1 ? "" : raw.slice(splitAt + sep.length);
    const nl = sep === "\r\n\r\n" ? "\r\n" : "\n";

    // Group folded headers (continuation lines start with whitespace).
    const entries: string[] = [];
    for (const line of headerBlock.split(nl)) {
      if (/^\s/.test(line) && entries.length > 0) entries[entries.length - 1] += nl + line;
      else entries.push(line);
    }

    // Headers that break forwarding (signed against original envelope) or
    // that SES must own for the new send.
    const strip = /^(return-path|sender|dkim-signature|from|reply-to|message-id):/i;
    let originalFrom = "";
    const kept = entries.filter((e) => {
      if (/^from:/i.test(e)) originalFrom = e.replace(/^from:\s*/i, "").trim();
      return !strip.test(e);
    });

    const newHeaders = [
      `From: ${fromAddr}`,
      originalFrom ? `Reply-To: ${originalFrom}` : "",
      ...kept,
    ].filter(Boolean);

    await ses.send(
      new SendRawEmailCommand({
        Source: fromAddr,
        Destinations: [forwardTo],
        RawMessage: {
          Data: Buffer.from(newHeaders.join(nl) + sep + body),
        },
      })
    );
    console.log(`Forwarded ${messageId} (from ${originalFrom || "unknown"}) to ${forwardTo}`);
  }
};
