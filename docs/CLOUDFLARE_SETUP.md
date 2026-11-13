# Cloudflare setup — beginner steps

## First deployment: maintenance page only
1. Sign in to your Cloudflare account.
2. Open Workers & Pages and start creating a Worker using a Git repository.
3. Authorize Cloudflare's GitHub integration for `fronthov/house-of-verona` only.
4. Choose the repository and `main` branch. Keep the project root at the repository root.
5. Build command: `npm run build`. Deploy command: `npx wrangler@4 deploy`.
6. Use Node.js 24 in the build environment. After deployment, verify the maintenance message.

This file does not claim a Cloudflare deployment has happened. No GoDaddy DNS changes are needed yet. Preserve `PREVIEW_ENABLED=false` until an intentional preview is approved. A private GitHub repository does not make a workers.dev website private.

## Database — next stage, not required by maintenance build
Create a D1 database named `hov-store`. Save the returned database ID (not an invented/example ID). Add a `d1_databases` entry to `wrangler.jsonc` with binding `DB`, database_name `hov-store`, the real database_id, and migrations_dir `drizzle`. Then use Wrangler's D1 migration commands against the intended local/remote database. The current Cloudflare entry point intentionally does not read D1 yet.

## Why account routes are closed
Sites previously supplied trusted identity headers. Public callers can forge those on an independently hosted Worker. The Cloudflare entry point rejects all account/commerce API calls until independent authentication is implemented. Merely adding API keys must never reopen those routes.

## Provider setup follows authentication
Configure secrets in Cloudflare's supported secret settings, never chat or GitHub source. Razorpay test credentials, verified Resend sender and WhatsApp Business provider details are needed. Live payment and shipping workflows are not implemented in this scaffold.

Official references:
- https://developers.cloudflare.com/workers/static-assets/binding/
- https://developers.cloudflare.com/workers/ci-cd/builds/git-integration/github-integration/
- https://developers.cloudflare.com/d1/get-started/
