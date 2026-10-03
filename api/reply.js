import { handleReplyRequest } from '../lib/handleReply.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Use POST.' });
    return;
  }

  const { status, payload } = await handleReplyRequest(req.body);
  res.status(status).json(payload);
}
