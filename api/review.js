// api/review.js
// Vercel serverless function. Vercel auto-parses JSON bodies into req.body
// for Node functions, and keeps OPENROUTER_API_KEY server-side only.

import { handleReviewRequest } from '../lib/handleReview.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Use POST.' });
    return;
  }

  const { status, payload } = await handleReviewRequest(req.body);
  res.status(status).json(payload);
}
