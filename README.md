# reporate

Rates GitHub repos like Amazon product reviews. Paste a repo, and an AI reads
the README, the language mix, the stats, and the latest commit, then writes
fake "customer reviews" as if the repo were a physical product someone
unboxed.

Zero frontend build step, zero npm dependencies. The only external call is to
the GitHub API (public, unauthenticated) and OpenRouter (for the reviews).

## Run it locally

```bash
git clone https://github.com/sidx1-scratch/reporate
cd reporate
cp .env.example .env   # then paste in your OpenRouter key
npm start
```

Open `http://localhost:3000`.

Get a free OpenRouter key at [openrouter.ai/keys](https://openrouter.ai/keys).
By default this uses a free model (`meta-llama/llama-3.3-70b-instruct:free`) —
no payment required. Free model IDs occasionally rotate on OpenRouter's end;
if it starts erroring, check [openrouter.ai/models?q=free](https://openrouter.ai/models?q=free)
and set `OPENROUTER_MODEL` in `.env` to a current one.

## Deploy to Vercel

1. Push this repo to GitHub.
2. Import it on [vercel.com/new](https://vercel.com/new).
3. In the project's **Settings → Environment Variables**, add:
   - `OPENROUTER_API_KEY` — your key (kept server-side, never sent to the browser)
   - `OPENROUTER_MODEL` — optional override
4. Deploy. Vercel auto-detects `api/review.js` as a serverless function and
   serves the rest of the repo as static files — no extra config needed.

## How it works

- `lib/dossier.js` — pulls repo metadata, language breakdown, and README from
  the GitHub REST API and flattens it into a plain-text "dossier."
- `lib/reviews.js` — sends that dossier to OpenRouter with a prompt asking for
  a JSON array of fake reviews, and validates/sanitizes whatever comes back.
- `lib/handleReview.js` — shared request logic used by both:
  - `api/review.js` — the Vercel serverless function (production)
  - `server.js` — a dependency-free local dev server (`npm start`)
- `index.html` / `style.css` / `app.js` — the frontend. Plain HTML/CSS/JS,
  no framework, no bundler.

## Notes

- Only works on **public** repos (no auth to the GitHub API, so no private
  repo access, and you'll hit GitHub's anonymous rate limit if you hammer it).
- Reviews are AI-generated satire. Don't take career advice from them.
