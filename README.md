# wordiplyunlimited

A [Next.js 14](https://nextjs.org) project using the App Router, TypeScript, and Tailwind CSS.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

- `app/` — App Router routes, layouts, and pages (`/` is Unlimited mode, `/daily`, `/custom`)
- `components/` — Shared React components
- `lib/` — Shared utilities, helpers, and client code (`lib/game.ts` is the whole game engine)
- `data/` — Source-of-truth build cache for the puzzle generator (see below); `data/puzzles.json` is imported directly into `lib/game.ts` and bundled into the client JS, not fetched
- `public/data/` — Runtime copy of `dictionary.txt` only, fetched client-side by `lib/game.ts`
- `scripts/` — One-off and maintenance scripts (not part of the Next.js build)

## Puzzle data

The entire game is a static site — there are **no API routes and no database**. All puzzle
data is precomputed offline by [`scripts/generate-puzzles.ts`](./scripts/generate-puzzles.ts)
(`npm run generate-puzzles`), which:

1. Downloads the ENABLE1 dictionary (cached at `data/dictionary.txt`) and a common-word
   frequency list (cached at `data/common-words.txt`, build-only).
2. Builds and filters a pool of 2,500+ puzzles into `data/puzzles.json`.
3. Copies `dictionary.txt` into `public/data/` — this is what actually ships to the browser
   and is fetched at runtime by `lib/game.ts`. `puzzles.json` stays in `data/` only: it's
   imported directly by `lib/game.ts` and bundled into the client JS at build time instead,
   so the puzzle pool is available synchronously with no fetch/loading state.
   `common-words.txt` is not copied anywhere; it's only needed to generate the pool, not to
   play it.

Re-run `npm run generate-puzzles` any time you want to regenerate the pool, then commit the
updated files in both `data/` and `public/data/`. Neither directory is gitignored — both
need to be committed for Vercel's git-based deploys to include them.

## Analytics

`components/Analytics.tsx` is a GA4 placeholder: it renders nothing (no script, no network
call) unless `NEXT_PUBLIC_GA_MEASUREMENT_ID` is set. Copy [`.env.example`](./.env.example) to
`.env.local` to test locally, or set the same variable in Vercel project settings when a real
measurement ID is ready.

## Domain & DNS

- **DNS**: Cloudflare (proxying should generally be set to **DNS only**, not proxied/orange-cloud, for the records pointed at Vercel — otherwise Vercel's SSL/domain verification and its own edge network can conflict with Cloudflare's proxy).
- **Hosting/Deploy**: Vercel
- **Canonical domain**: `https://wordiplyunlimited.com` (apex, no `www`)

### Required redirects

All of the following must resolve with a `301` to `https://wordiplyunlimited.com`:

- `https://www.wordiplyunlimited.com`
- `http://wordiplyunlimited.com`
- `http://www.wordiplyunlimited.com`

### Vercel domain configuration steps

The redirect should be configured **at the Vercel domain level** — this is the primary mechanism and is enforced at Vercel's edge before any application code runs:

1. In the Vercel project, go to **Settings → Domains**.
2. Add `wordiplyunlimited.com` and set it as the **primary domain**.
3. Add `www.wordiplyunlimited.com` and set it to **redirect to** the primary domain (Vercel will offer this as a redirect alias when you add it after the apex is primary).
4. Confirm **HTTPS is enforced** — Vercel enforces HTTPS by default for all domains it manages (no plaintext HTTP is served); double check there is no setting overriding this for the project.
5. In Cloudflare DNS, point the apex (`@`) and `www` records at Vercel per Vercel's provided DNS instructions (typically an `A`/`ALIAS` record for the apex and a `CNAME` for `www`), with the proxy status set to **DNS only** so Vercel can issue and serve its own TLS certificates and handle the redirect.

### `next.config.js` redirect (fallback only)

This repo also defines `redirects()` in [`next.config.js`](./next.config.js) that redirects `www.wordiplyunlimited.com` (any protocol) and plain-HTTP `wordiplyunlimited.com` to `https://wordiplyunlimited.com`. This exists **only as a safety net** in case the Vercel domain-level redirect above isn't active yet (e.g. mid-migration, or `www` added without the redirect alias configured). It intentionally uses `next.config.js` `redirects()` — not middleware — so the redirect is handled by Vercel's edge routing at zero cost, without invoking a serverless/edge function per request.

Once the Vercel domain settings above are confirmed active, this config rule should keep working harmlessly as a backup; it does not need to be removed.

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Vercel Domains Documentation](https://vercel.com/docs/projects/domains)
