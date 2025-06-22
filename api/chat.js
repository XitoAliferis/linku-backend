// src/app/api/chat/route.js

import { NextResponse } from 'next/server';
import { LettaClient } from '@letta-ai/letta-client';
import { createClient } from '@supabase/supabase-js';

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

export async function POST(req) {
  try {
    const { userId, message } = await req.json();
    const agentId = await getAgentIdForUser(userId);
    if (!agentId) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // send user message to Letta
    const response = await letta.agents.messages.create(agentId, {
      messages: [{ role: 'user', content: message }],
    });

    const assistantReply =
      response.messages.find((m) => m.messageType === 'assistant_message')
        ?.content ?? '';

    return NextResponse.json({ reply: assistantReply });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: 'Internal server error', detail: err.message },
      { status: 500 }
    );
  }
}
