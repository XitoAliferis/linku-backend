// api/chat.js

import { LettaClient } from '@letta-ai/letta-client';
import { createClient } from '@supabase/supabase-js';

// Use Vercel's process.env for environment variables
const letta = new LettaClient({ baseUrl: process.env.LETTA_BASE_URL });
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function getAgentIdForUser(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('agent_id')
    .eq('user_id', userId)
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
    // For Vercel: parse the JSON body
    const { userId, message } = req.body || {};

    // Optional: fallback to parsing the raw body if needed (for some deployments)
    // const body = req.body ? req.body : JSON.parse(await new Promise((resolve) => {
    //   let data = '';
    //   req.on('data', chunk => data += chunk);
    //   req.on('end', () => resolve(data));
    // }));

    const agentId = await getAgentIdForUser(userId);
    if (!agentId) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }

    // Send user message to Letta
    const response = await letta.agents.messages.create(agentId, {
      messages: [{ role: 'user', content: message }],
    });

    const assistantReply =
      response.messages.find((m) => m.messageType === 'assistant_message')
        ?.content ?? '';

    res.status(200).json({ reply: assistantReply });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error', detail: err.message });
  }
}
