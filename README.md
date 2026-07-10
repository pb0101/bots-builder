# Bots Builder — website & infrastructure

Marketing site + enrollment flow for Bots Builder LLC (kids robotics classes, Frisco TX).

**Stack:** Next.js 14 (static export) · S3 + CloudFront · Amazon Cognito (Hosted UI, code + PKCE)
· API Gateway HTTP API + Lambda (Node 20, ARM) · DynamoDB · Stripe Checkout · AWS CDK v2 ·
GitHub Actions with OIDC (no stored AWS keys).

```
web/        Next.js site (static export → S3/CloudFront)
functions/  Lambdas: cohorts, create-checkout, stripe-webhook, enrollments, waitlist, admin
infra/      CDK app: Auth, Api, Web, GithubOidc stacks
scripts/    seed-cohorts.sh — first fall cohorts
.github/    Deploy workflow
```

## Architecture

```
Browser ──► CloudFront ──► S3 (static Next.js export)
   │
   ├─ sign in ──► Cognito Hosted UI (OAuth code + PKCE) ──► JWT in browser
   │
   ├─ GET  /cohorts (public) ────────────────────┐
   ├─ POST /checkout · GET /enrollments          ├─► API Gateway ──► Lambda ──► DynamoDB / Stripe
   ├─ POST /waitlist · /admin/* (JWT + group) ───┘
   └─ Stripe ► POST /webhook (signature-verified) ──► Lambda ──► DynamoDB
```

## First-time setup

### 0. Prerequisites
- AWS account bootstrapped for CDK: `npx cdk bootstrap aws://ACCOUNT/us-east-1` (run in `infra/`)
- A Stripe account, GitHub repo, Node 20.

### 1. Stripe products
In the Stripe dashboard create one Product per program with a one-time Price, then store secrets
in SSM (SecureString):

```bash
aws ssm put-parameter --name /bots-builder/stripe/secret-key   --type SecureString --value sk_live_...
aws ssm put-parameter --name /bots-builder/stripe/webhook-secret --type SecureString --value whsec_placeholder
aws ssm put-parameter --name /bots-builder/stripe/price-map    --type SecureString --value \
'{"trial":"price_...","junior":"price_...","explorer":"price_...","builder":"price_...","coder":"price_...","competitor":"price_..."}'
```
(The `price-map` keys must match program ids in `web/src/lib/programs.ts`.)

### 2. First deploy (from your laptop)
```bash
npm ci
export AUTH_DOMAIN_PREFIX=bots-builder-auth-yourname   # must be globally unique
export GITHUB_REPO=your-github-user/bots-builder
npm run build -w web            # SITE_URL not known yet; localhost defaults are fine
cd infra && npx cdk deploy --all
```
Note the outputs: `SiteUrl`, `ApiUrl`, `UserPoolId`, `UserPoolClientId`, `AuthDomain`,
`OidcAuthority`, `DeployRoleArn`.

### 3. Wire the real URLs
- **Stripe webhook:** add endpoint `<ApiUrl>/webhook` for events `checkout.session.completed`
  **and** `checkout.session.expired` (expiry releases abandoned seat holds),
  copy the signing secret, and overwrite `/bots-builder/stripe/webhook-secret` in SSM.
- **GitHub → Settings → Variables (Actions):** set
  `AWS_DEPLOY_ROLE_ARN`, `SITE_URL` (the CloudFront URL, no trailing slash),
  `AUTH_DOMAIN_PREFIX`, `NEXT_PUBLIC_COGNITO_AUTHORITY` (= OidcAuthority),
  `NEXT_PUBLIC_COGNITO_CLIENT_ID`, `NEXT_PUBLIC_COGNITO_DOMAIN` (= AuthDomain),
  `NEXT_PUBLIC_API_URL` (= ApiUrl).
- Push to `main`. The workflow rebuilds with real env values and redeploys; the redeploy also
  updates Cognito callback URLs and API CORS to the real `SITE_URL`.

### 4. Local development
```bash
cp web/.env.local.example web/.env.local   # paste stack outputs
npm run dev -w web                          # http://localhost:3000
```
Localhost is pre-registered as a Cognito callback/logout URL and a CORS origin.

## Email (SES)
1. Verify your sending identity: `aws sesv2 create-email-identity --email-identity hello@botsbuilder.com`
   (or verify the whole domain once you have one) and click the verification email.
2. Set GitHub variables `FROM_EMAIL` and `OWNER_EMAIL`. `OWNER_EMAIL` also enables the
   webhook-error CloudWatch alarm.
3. **SES starts in sandbox**: it can only send TO verified addresses. Verify your own inbox for
   testing, then request production access in the SES console (takes ~a day) before launch.
   All sends are best-effort — email failures never break payments.

## Custom domain (optional)
Buy the domain, create a Route 53 hosted zone, then set GitHub variables `DOMAIN_NAME`,
`HOSTED_ZONE_ID`, `HOSTED_ZONE_NAME` and update `SITE_URL` to `https://yourdomain.com`.
The next deploy adds the ACM cert (DNS-validated), CloudFront aliases, and A records for
apex + www. Also update `web/public/robots.txt` / `sitemap.xml` hostnames.

## Data model (single table `bots-builder-enrollments`)

| pk | sk | what |
|---|---|---|
| `COHORT` | `COHORT#<id>` | a scheduled class: program, dates, day/time, location, capacity, enrolledCount, status |
| `USER#<sub>` | `ENROLLMENT#<sessionId>` | one paid seat: student name/age, cohortId, payment info (+ `gsi1pk=COHORT#<id>` for rosters) |
| `COHORT#<id>` | `WAITLIST#<sub>` | one waitlist entry per parent per cohort |
| `LEAD` | `LEAD#<ts>#<email>` | contact-form inquiries (also emailed to `OWNER_EMAIL`) |

Seat accounting (race-proof): `seatsTaken` counts paid seats **plus live checkout holds**.
`POST /checkout` takes a hold with an atomic conditional increment (`seatsTaken < capacity`),
so two parents cannot buy the last seat. Stripe sessions expire after 30 minutes;
`checkout.session.expired` releases the hold, `checkout.session.completed` converts it to a
paid seat (idempotent). `enrolledCount` tracks paid seats only. A nightly EventBridge Lambda
reconciles both counters against the enrollment records (source of truth) and sends
7-day and 1-day reminder emails to enrolled families.

## Cohorts & admin
- Seed the first cohorts: `./scripts/seed-cohorts.sh` (edit dates first), or use the admin UI.
- Make yourself staff:
  `aws cognito-idp admin-add-user-to-group --user-pool-id <POOL> --username <your-email> --group-name admin`
  then sign out/in to refresh the token. `/admin/` unlocks cohort creation and per-cohort rosters
  (students, ages, parent emails, payment status, waitlist). The API enforces the group claim
  server-side; the page gate is convenience only.

## Payment flow
1. Parent picks a cohort on `/schedule/`, enters the child's first name + age.
   If signed out, the intent is stashed and resumed on the dashboard after Cognito sign-in.
2. `POST /checkout` validates seats, then creates a Stripe Checkout Session carrying
   `userSub, programId, cohortId, studentName, studentAge` in metadata.
3. Stripe calls `POST /webhook`: signature verified, enrollment written idempotently,
   seat count incremented, cohort auto-marked full at capacity.
4. Dashboard shows enrollments joined with live cohort dates; full cohorts offer a waitlist.

## Security notes
- No AWS keys in GitHub: Actions assumes `bots-builder-github-deploy` via OIDC, restricted to
  `main` on your repo, and can only assume the CDK bootstrap roles.
- Stripe secrets live in SSM SecureString, fetched at Lambda cold start, never in env vars,
  code, or CI.
- S3 bucket is private (CloudFront OAC); HTTPS enforced end to end.
- Cognito app client is a public SPA client: PKCE, no client secret, user-existence errors off.
- The webhook route is unauthenticated by design and trusts only Stripe's signature.

## Costs (pre-revenue)
S3 + CloudFront + Lambda + HTTP API + DynamoDB on-demand + Cognito ≈ **$1–3/month** at
launch traffic. Stripe charges per transaction only.

## Launch checklist (day of)
1. `cdk bootstrap` → first `cdk deploy --all` from laptop → note outputs.
2. SSM Stripe params set (test keys first); Stripe webhook endpoint added; webhook secret updated.
3. GitHub variables set (role ARN, SITE_URL, Cognito vars, API URL, FROM/OWNER_EMAIL) → push → green deploy.
4. SES identity verified (sandbox: verify your own inbox too).
5. `./scripts/seed-cohorts.sh` (edit dates) — or create cohorts in `/admin/`.
6. Add yourself to the Cognito `admin` group; sign out/in.
6a. Create the `SIBLING10` promotion code in Stripe (10% off) — checkout already accepts codes.
6b. Run `./scripts/smoke.sh <SITE_URL> <API_URL>` — homepage, schedule, and API health in one shot.
7. Full test-mode dress rehearsal: sign up → enroll with card `4242 4242 4242 4242` → confirm
   dashboard shows the class, seat count dropped, both emails arrived, roster shows the student.
8. Swap SSM to live Stripe keys + live webhook secret → one real $25 trial-workshop purchase →
   refund it from the Stripe dashboard (also verifies the refund path).

## Backlog (nice-to-haves)
- Custom domain (Route 53 + ACM cert on CloudFront, add domain to Cognito callback URLs)
- Photo-release e-signature flow (DocuSign/Dropbox Sign) replacing the paper form
- Testimonials + photo gallery sections once the first cohort generates them
- Instructor accounts (second Cognito group) with roster-only access
- Multi-location support when venue #2 arrives
