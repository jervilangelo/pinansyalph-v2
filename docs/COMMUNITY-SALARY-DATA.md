# Community salary data: design notes (not built)

"Underpaid ba ko?" uses only PSA's published Occupational Wages Survey. Anonymous, community-reported salaries
could fill gaps PSA does not cover (IT, HR, customer service, experience levels), but collecting pay data from the
public is only worth doing with privacy and abuse controls in place from day one. Nothing below is implemented, and
the site sends no salary data anywhere today.

## Principles

1. **Separate, always.** Community figures live in their own dataset and their own part of the page, labelled
   "community-reported", and are never averaged with, merged into, or presented as PSA statistics.
2. **Aggregates only.** No individual submission is ever displayed or downloadable. A group (job × region ×
   experience) is shown only once it has at least 30 accepted submissions, and figures are rounded to the nearest
   ₱500.
3. **Minimum data.** No name, email, employer name or exact location is asked for. IP addresses are used only for
   rate limiting and are not stored with submissions.
4. **Same pay definitions as PSA.** Basic pay and regular allowances, gross, monthly, so the two sources stay
   comparable in meaning even though they are kept apart.

The submission shape is already defined as `CommunitySubmission` in [`src/types/salary.ts`](../src/types/salary.ts).

## Proposed architecture (AWS serverless)

```
Browser ──POST──▶ API Gateway (HTTP API)
                    │  throttling per route, CORS locked to the site origin
                    ▼
                 Lambda: submit
                    │  zod validation with the shared schema
                    │  Cloudflare Turnstile or reCAPTCHA token check
                    │  per-IP-hash rate limit (DynamoDB TTL item)
                    │  plausibility checks (range, outliers vs PSA for the same group)
                    ▼
                 DynamoDB: submissions (pending)  ── TTL on raw rows after aggregation
                    │
         EventBridge schedule (daily)
                    ▼
                 Lambda: aggregate
                    │  drops flagged rows, applies the 30-row minimum,
                    │  computes median and quartiles per group, rounds
                    ▼
                 S3: community-aggregates.json (public, read-only)
                    ▼
                 Site reads the aggregate file; never the raw table
```

- **Moderation**: submissions far outside the plausible range for their group are held for review rather than
  accepted. A simple admin view (Cognito-protected) can approve or delete held rows.
- **Abuse prevention**: CAPTCHA, per-IP-hash and per-group rate limits, and a cap on submissions per group per day,
  so one person cannot move a median.
- **Retention**: raw submissions are deleted (DynamoDB TTL) once they have been aggregated for 12 months; only
  aggregates remain.
- **Cost**: within AWS free-tier limits at expected volume.

## Before building

- Write a privacy notice covering what is collected, why, retention and deletion requests (Data Privacy Act of
  2012, RA 10173).
- Decide who moderates, and how fast.
- Add tests that the aggregate never contains a group under the minimum size.
