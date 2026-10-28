import type { IncomingMessage, ServerResponse } from 'node:http';
import { handleAssistantRequest } from '../src/server/assistantHandler.js';

export default async function handler(req: IncomingMessage & { body?: any }, res: ServerResponse) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end(JSON.stringify({ error: 'Method Not Allowed' }));
    return;
  }

  let bodyData = req.body;
  if (!bodyData) {
    let raw = '';
    for await (const chunk of req) {
      raw += chunk;
    }
    try {
      bodyData = JSON.parse(raw);
    } catch {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: 'Malformed JSON' }));
      return;
    }
  }

  try {
    const result = await handleAssistantRequest(bodyData, req.socket?.remoteAddress);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(result));
  } catch (err: any) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: err.message || 'Internal error' }));
  }
}
