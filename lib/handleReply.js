import { generateReviewerReply, DEFAULT_MODEL } from './reviews.js';

export async function handleReplyRequest(body) {
  const { review, userReply } = body || {};
  if (!review || !userReply) {
    return { status: 400, payload: { error: 'Missing "review" or "userReply" field in request body.' } };
  }

  try {
    const data = await generateReviewerReply(review, userReply, {
      apiKey: process.env.OPENROUTER_API_KEY,
      model: process.env.OPENROUTER_MODEL || DEFAULT_MODEL,
    });
    return {
      status: 200,
      payload: data, // { reply: string }
    };
  } catch (err) {
    return { status: 502, payload: { error: err.message } };
  }
}
