// lib/handleReview.js
// Shared logic for the /api/review endpoint, used by both the Vercel
// serverless function (api/review.js) and the local dev server (server.js).

import { buildDossier } from './dossier.js';
import { generateReviews, DEFAULT_MODEL } from './reviews.js';

export async function handleReviewRequest(body) {
  const repoInput = body?.repo;
  if (!repoInput || typeof repoInput !== 'string') {
    return { status: 400, payload: { error: 'Missing "repo" field in request body.' } };
  }

  let dossier;
  try {
    dossier = await buildDossier(repoInput);
  } catch (err) {
    return { status: 404, payload: { error: err.message } };
  }

  try {
    const reviews = await generateReviews(dossier.dossierText, {
      apiKey: process.env.OPENROUTER_API_KEY,
      model: process.env.OPENROUTER_MODEL || DEFAULT_MODEL,
    });
    return {
      status: 200,
      payload: {
        repo: dossier.fullName,
        description: dossier.description,
        stars: dossier.stars,
        forks: dossier.forks,
        openIssues: dossier.openIssues,
        license: dossier.license,
        languageBreakdown: dossier.languageBreakdown,
        reviews,
      },
    };
  } catch (err) {
    return { status: 502, payload: { error: err.message } };
  }
}
