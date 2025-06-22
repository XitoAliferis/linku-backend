// api/chat.js

import { LettaClient } from '@letta-ai/letta-client';
import { createClient } from '@supabase/supabase-js';

// Use Vercel's process.env for environment variables

console.log('Using environment variables:', {
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  LETTA_PG_URI: process.env.LETTA_PG_URI,
});

// const letta = new LettaClient({ baseUrl: process.env.LETTA_PG_URI });
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
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }
  try {
    const { userId, message } = req.body || {};

    // const agentId = await getAgentIdForUser(userId);
    const agentId = "agent-dfda8c45-9284-46a6-adef-047bf4f0657c";


    if (!agentId || !message || typeof message !== 'string') {
      res.status(400).json({ error: 'Missing agentId or message' });
      return;
    }

    // Actually call Letta
    const response = await letta.agents.messages.create(agentId, {
      messages: [{ role: 'user', content: message }],
    });

    const assistantReply =
      response.messages.find((m) => m.messageType === 'assistant_message')
        ?.content ?? '';

    res.status(200).json({ reply: assistantReply });
  } catch (err) {
    console.error('Error in /api/chat:', err);
    res.status(500).json({ error: 'Internal server error', detail: err.message });
  }
}
