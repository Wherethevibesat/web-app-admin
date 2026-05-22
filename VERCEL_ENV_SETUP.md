# Vercel environment variables

The admin app **will not run** on Vercel until these are set.

## Steps

1. Open [Vercel Dashboard](https://vercel.com) → project **web-app-admin**
2. **Settings** → **Environment Variables**
3. Add each row below (copy values from your local `.env.local`):

| Name | Environments to enable |
|------|------------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production, Preview, Development |
| `SUPABASE_SERVICE_ROLE_KEY` | Production, Preview, Development |
| `NEXT_PUBLIC_SITE_URL` | Production, Preview — use `https://web-app-admin-nine.vercel.app` or your custom domain |

4. **Deployments** → latest deployment → **⋯** → **Redeploy**

## Common mistakes

- Variable name typo (`SUPABASE_ANON_KEY` instead of `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
- Only added to **Development**, not **Production**
- Added vars but **did not redeploy**
- Wrapped values in extra quotes in Vercel (paste the key only, no quotes)

## Verify

After redeploy, open your site root. You should see **Sign in**, not this configuration page.
