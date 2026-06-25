// lib/reviews.js
// Sends the repo dossier to OpenRouter and asks for fake "customer reviews."

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

// A capable model on OpenRouter's free tier. Free model availability and IDs
// shift over time — if this 404s, check https://openrouter.ai/models?q=free
// and set OPENROUTER_MODEL in your environment to override.
const DEFAULT_MODEL = 'meta-llama/llama-3.3-70b-instruct:free';

const SYSTEM_PROMPT = `You write fake Amazon-style customer reviews for a GitHub repository, \
as if it were a physical product someone unboxed and used. You will receive a \
"dossier" of real facts about the repo: its description, stats, language mix, \
README, and latest commit message.

Write reviews that are specific and observant — reference real details from the \
dossier (actual setup steps, actual wording from the README, actual quirks, \
actual stats) rather than generic praise or complaints. Treat bugs, confusing \
docs, or rough edges as product flaws ("the box didn't include batteries"), and \
treat genuinely good design choices as pleasant surprises. Vary the star ratings \
realistically — not everything should be 5 stars. Each reviewer should have a \
distinct voice and a generic human name with a city/country location, like a real \
storefront review. Keep each review 2-4 sentences. Be funny, not cruel.

Respond ONLY with a raw JSON array, no markdown fences, no commentary, in this \
exact shape:
[
  {
    "name": "string",
    "location": "string",
    "rating": 1-5 integer,
    "title": "string",
    "body": "string",
    "verified": true or false,
    "helpfulVotes": small integer
  }
]`;

function buildUserPrompt(dossierText) {
  return `Here is the dossier for the repo. Write 7 reviews.\n\n${dossierText}`;
}

function extractJsonArray(text) {
  const cleaned = text.trim().replace(/^```(json)?/i, '').replace(/```$/, '').trim();
  const start = cleaned.indexOf('[');
  const end = cleaned.lastIndexOf(']');
  if (start === -1 || end === -1) {
    throw new Error('Model response did not contain a JSON array.');
  }
  return JSON.parse(cleaned.slice(start, end + 1));
}

export async function generateReviews(dossierText, { apiKey, model, refererUrl } = {}) {
  if (!apiKey) {
    throw new Error('Missing OPENROUTER_API_KEY on the server.');
  }

  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      // OpenRouter uses these for its public leaderboards; harmless to include.
      'HTTP-Referer': refererUrl || 'https://repocart.app',
      'X-Title': 'RepoCart',
    },
    body: JSON.stringify({
      model: model || DEFAULT_MODEL,
      temperature: 1.0,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildUserPrompt(dossierText) },
      ],
    }),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    throw new Error(`OpenRouter error (${res.status}): ${errBody.slice(0, 300)}`);
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error('OpenRouter returned no content.');
  }

  const reviews = extractJsonArray(text);
  if (!Array.isArray(reviews) || reviews.length === 0) {
    throw new Error('Model response was not a non-empty array of reviews.');
  }

  return reviews
    .filter((r) => r && r.name && r.body)
    .map((r) => ({
      name: String(r.name).slice(0, 60),
      location: String(r.location || 'Internet').slice(0, 60),
      rating: Math.min(5, Math.max(1, Math.round(Number(r.rating) || 3))),
      title: String(r.title || '').slice(0, 120),
      body: String(r.body).slice(0, 1000),
      verified: Boolean(r.verified),
      helpfulVotes: Math.max(0, Math.round(Number(r.helpfulVotes) || 0)),
    }));
}

export { DEFAULT_MODEL };
