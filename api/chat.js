// api/chat.js

import { LettaClient } from '@letta-ai/letta-client';
import { createClient } from '@supabase/supabase-js';

// Initialize Letta + Supabase clients
const letta = new LettaClient({ token: process.env.LETTA_API_KEY });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function getAgentIdForUser(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('agent_id')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data.agent_id;
}

export default async function handler(req, res) {
  // ──────────── CORS ────────────
  res.setHeader("Access-Control-Allow-Origin", "*"); // for development
  // res.setHeader("Access-Control-Allow-Origin", "https://YOUR_FRONTEND_URL"); // for prod
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  // ─────────────────────────────

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { userId, message } = req.body || {};

    // For testing, hard‐code an agent or pull via getAgentIdForUser
    // const agentId = await getAgentIdForUser(userId);
    const agentId = "agent-dfda8c45-9284-46a6-adef-047bf4f0657c";

    if (!agentId || !message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Missing agentId or message' });
    }

    console.log('Received request:', { userId, agentId, message });

    // Call Letta
    const response = await letta.agents.messages.create(agentId, {
      messages: [{ role: 'user', content: message }],
    });

    console.log('Response from Letta:', response);

    const assistantReply =
      response.messages.find((m) => m.messageType === 'assistant_message')
        ?.content ?? '';

    return res.status(200).json({ reply: assistantReply });
  } catch (err) {
    console.error('Error in /api/chat:', err);
    return res
      .status(500)
      .json({ error: 'Internal server error', detail: err.message });
  }
}