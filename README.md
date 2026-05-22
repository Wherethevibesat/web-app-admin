# WTVA Web Admin

Operations admin portal for **Where The Vibes At**.

**Web is admins only.** Customers and venue owners use the Flutter mobile apps in `c:\src\thisishtx` — not a separate customer/business website.

## Quick start

1. Copy `.env.example` → `.env.local` (include `SUPABASE_SERVICE_ROLE_KEY`)
2. Run SQL migrations in Supabase (in order):
   - From Flutter repo: `000_full_database.sql`, `003_business_verification.sql`
   - From this repo: `004_web_platform.sql`, `005_stripe_and_withdrawals.sql`
3. `npm run dev` → http://localhost:3000

## Admin features

| Area | Capabilities |
|------|----------------|
| Dashboard | Live KPIs |
| Venues | Full CRUD, feature, verification status |
| Events | Full CRUD |
| VIP Packages | Full CRUD |
| Users | List, search, edit, delete, change roles (audit log) |
| Submissions | Approve venues & events |
| Verification | View docs (signed URL), approve/reject |
| Settings | Platform fees & rules |
| Earnings | Transactions, request withdrawals |
| Stripe | Save publishable key, list Connect accounts |

## Still requires Edge Functions (production)

- `stripe-validate-keys` — test secret key server-side
- `stripe-create-payout` — complete withdrawals in Stripe
- Store Stripe **secret** in Supabase secrets only

## Deploy on Vercel

Import [github.com/Wherethevibesat/web-app-admin](https://github.com/Wherethevibesat/web-app-admin), then under **Settings → Environment Variables** add (all environments: Production, Preview, Development):

| Variable | Required |
|----------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes (admin APIs + role sync) |
| `NEXT_PUBLIC_SITE_URL` | Yes — e.g. `https://web-app-admin-nine.vercel.app` or your custom domain |

Redeploy after saving env vars. If they are missing, the app shows `/configuration-error` instead of a 500.

## Related

- Flutter: `c:\src\thisishtx`
- Supabase project: `wabtknktqnrxnffkgpzh`
