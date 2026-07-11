import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { sendEmail } from "./email";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

/**
 * EventBridge cron (daily, before business hours):
 * 1) Reconcile seat counters from the source of truth (enrollment records).
 *    Also clears any leaked holds — Stripe sessions expire in 30 min, so at
 *    this hour seatsTaken should equal paid enrollments.
 * 2) Send reminder emails to enrolled families 7 days and 1 day before start.
 */
export const handler = async (): Promise<void> => {
  const table = process.env.TABLE_NAME!;
  const cohortsRes = await ddb.send(
    new QueryCommand({
      TableName: table,
      KeyConditionExpression: "pk = :pk",
      ExpressionAttributeValues: { ":pk": "COHORT" },
    })
  );

  const dayOffset = (n: number) => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  };
  const in7 = dayOffset(7);
  const in1 = dayOffset(1);

  for (const c of cohortsRes.Items ?? []) {
    const cohortId = c.cohortId as string;

    // --- reconcile ---
    const enrollRes = await ddb.send(
      new QueryCommand({
        TableName: table,
        IndexName: "gsi1",
        KeyConditionExpression: "gsi1pk = :pk",
        ExpressionAttributeValues: { ":pk": `COHORT#${cohortId}` },
      })
    );
    const paid = (enrollRes.Items ?? []).length;
    if (paid !== c.enrolledCount || paid !== c.seatsTaken) {
      console.log(`Reconciling ${cohortId}: paid=${paid} enrolled=${c.enrolledCount} taken=${c.seatsTaken}`);
      await ddb.send(
        new UpdateCommand({
          TableName: table,
          Key: { pk: "COHORT", sk: `COHORT#${cohortId}` },
          UpdateExpression: "SET enrolledCount = :n, seatsTaken = :n",
          ExpressionAttributeValues: { ":n": paid },
        })
      );
    }

    // --- reminders ---
    const isWeekOut = c.startDate === in7;
    const isTomorrow = c.startDate === in1;
    if ((isWeekOut || isTomorrow) && paid > 0) {
      const when = `${c.dayOfWeek} at ${c.time}, ${c.location}`;
      const subject = isTomorrow
        ? "Robotics starts tomorrow — quick reminder"
        : "Robotics starts in one week";
      const note = isTomorrow
        ? "Arrive 5 minutes early for day one. Everything is provided — just bring a water bottle."
        : "Mark the calendar! We'll send one more reminder the day before.";
      for (const e of enrollRes.Items ?? []) {
        if (!e.email) continue;
        await sendEmail(
          [e.email],
          subject,
          `Hi,\n\n${e.studentName}'s class starts ${isTomorrow ? "tomorrow" : c.startDate}: ${when}.\n\nWhere: Frisco Public Library, 8000 Dallas Pkwy, Frisco, TX 75034.\n\n${note}\n\nThe last 10 minutes of every class is a showcase — you're welcome at pickup.\n\n— Bots Builder · Frisco Public Library, Frisco TX`
        );
      }
    }
  }
};
