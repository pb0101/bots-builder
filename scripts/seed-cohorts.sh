#!/usr/bin/env bash
# Seed a first set of fall cohorts straight into DynamoDB.
# Usage: ./scripts/seed-cohorts.sh   (requires AWS CLI creds for the account)
set -euo pipefail
TABLE=bots-builder-enrollments

put() {
  aws dynamodb put-item --table-name "$TABLE" --item "$1" >/dev/null && echo "seeded: $2"
}

put '{
  "pk":{"S":"COHORT"},"sk":{"S":"COHORT#explorer-2026-09-12"},
  "cohortId":{"S":"explorer-2026-09-12"},"programId":{"S":"explorer"},
  "startDate":{"S":"2026-09-12"},"endDate":{"S":"2026-10-31"},
  "dayOfWeek":{"S":"Saturday"},"time":{"S":"10:00 AM"},
  "location":{"S":"Frisco, TX"},"capacity":{"N":"8"},
  "enrolledCount":{"N":"0"},"status":{"S":"open"}
}' "explorer Sat 10am"

put '{
  "pk":{"S":"COHORT"},"sk":{"S":"COHORT#explorer-2026-09-13"},
  "cohortId":{"S":"explorer-2026-09-13"},"programId":{"S":"explorer"},
  "startDate":{"S":"2026-09-13"},"endDate":{"S":"2026-11-01"},
  "dayOfWeek":{"S":"Sunday"},"time":{"S":"2:00 PM"},
  "location":{"S":"Frisco, TX"},"capacity":{"N":"8"},
  "enrolledCount":{"N":"0"},"status":{"S":"open"}
}' "explorer Sun 2pm"

put '{
  "pk":{"S":"COHORT"},"sk":{"S":"COHORT#junior-2026-09-12"},
  "cohortId":{"S":"junior-2026-09-12"},"programId":{"S":"junior"},
  "startDate":{"S":"2026-09-12"},"endDate":{"S":"2026-10-31"},
  "dayOfWeek":{"S":"Saturday"},"time":{"S":"1:00 PM"},
  "location":{"S":"Frisco, TX"},"capacity":{"N":"8"},
  "enrolledCount":{"N":"0"},"status":{"S":"open"}
}' "junior Sat 1pm"

put '{
  "pk":{"S":"COHORT"},"sk":{"S":"COHORT#builder-2026-09-13"},
  "cohortId":{"S":"builder-2026-09-13"},"programId":{"S":"builder"},
  "startDate":{"S":"2026-09-13"},"endDate":{"S":"2026-11-01"},
  "dayOfWeek":{"S":"Sunday"},"time":{"S":"10:00 AM"},
  "location":{"S":"Frisco, TX"},"capacity":{"N":"8"},
  "enrolledCount":{"N":"0"},"status":{"S":"open"}
}' "builder Sun 10am"

put '{
  "pk":{"S":"COHORT"},"sk":{"S":"COHORT#trial-2026-08-22"},
  "cohortId":{"S":"trial-2026-08-22"},"programId":{"S":"trial"},
  "startDate":{"S":"2026-08-22"},"endDate":{"S":"2026-08-22"},
  "dayOfWeek":{"S":"Saturday"},"time":{"S":"10:00 AM"},
  "location":{"S":"Frisco, TX"},"capacity":{"N":"8"},
  "enrolledCount":{"N":"0"},"status":{"S":"open"}
}' "trial workshop Aug 22"
