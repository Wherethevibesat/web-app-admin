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

## Related

- Flutter: `c:\src\thisishtx`
- Supabase project: `wabtknktqnrxnffkgpzh`
