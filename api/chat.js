// api/chat.js

import { LettaClient } from '@letta-ai/letta-client';
import { createClient } from '@supabase/supabase-js';

// Initialize Letta + Supabase clients
const letta = new LettaClient({ token: process.env.LETTA_API_KEY });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// system prompt for the agent
const systemPrompt = `You are an agent trying to understand the user better. Do not use AI assistant text but rather someone trying to get to know that person. Do not refer yourself as AI or a AI assistant or Claude. Try to understand the user andmore about them. 

You are Claude, an AI assistant engaging in a short back-and-forth conversation with a user. Your goal is to understand who the user is and learn a lot about them. Follow these guidelines:

1. Ask deep and engaging questions that can build off previous questions.
2. Cover a breadth of topics to allow you to replicate the user's interests.
3. As the conversation progresses, adapt your communication style to match the user's tone and style.
4. Do not give very long responses keep it shorter and conversational.

When the user provides input, it will be in the following format:
<user_input>
{{USER_INPUT}}
</user_input>

Start the conversation by introducing yourself and asking an open-ended question about the user's interests or background. After each user response, analyze their input and formulate a follow-up question based on what you've learned. Try to explore different aspects of their personality, experiences, and opinions.

As you learn more about the user, incorporate details from their previous responses into your questions and comments to show active listening and engagement. Gradually adjust your language and tone to mirror the user's communication style.

For each interaction, follow this structure:
1. Analyze the user's input (if applicable)
2. Formulate a response and/or question
3. Output your response

Format your output as follows:
<claude_response>
[Your response and/or question here]
<continue / end> 
</claude_response>

Remember to keep the conversation flowing naturally and avoid repetitive or overly generic questions. Your goal is to create a meaningful and engaging dialogue that reveals the user's unique personality and interests.

IMPORTANT
Don't have Claude drag out the conversations too long. When Claude feels like there is enough breadth and depth of information to store and reuse to talk to another person with the simialr textual tone, interests, and personality as the user please add the tag <continue> at the end of the text.  If Claude feels like no more is needed add the tag <end>.
`;

const constant = "Remember to add the tag from the system prompt";

/**
 * Optionally lookup agent id for a user in Supabase.
 * Not used in main flow, but kept for future dev.
 */
async function getAgentIdForUser(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('agent_id')
    .eq('id', userId)
    .single();
  if (error) throw error;

  // If we found an agent_id, return it
  if (data && data.agent_id) {
    return data.agent_id;
  }

  console.log(`No agent found for user ${userId}. Creating new agent...`);

  // Otherwise, create a new Letta agent
  const agent = await letta.agents.create({
    memoryBlocks: [
      { label: "human", value: `User ID: ${userId}` },
      { label: "system", value: systemPrompt },
      { label: "persona", value: "You are a agent meant to understand who the user is what they like and how to talk like them. Speak in a conversational manner." },
    ],
    model: "anthropic/claude-3-5-haiku",
    embedding: "openai/text-embedding-3-small",
    tools: [], 
  });

  // Store the new agent_id in Supabase for this user
  const { data: updateData, error: updateError } = await supabase
    .from('profiles')
    .update({ agent_id: agent.id })
    .eq('id', userId);
  if (updateError) throw updateError;
  console.log('Supabase update result:', updateData, updateError);

  // Return the newly created agent_id
  return agent.id;
}

export default async function handler(req, res) {
  // ──────────── CORS ────────────
  res.setHeader("Access-Control-Allow-Origin", "*"); // for development
  // res.setHeader("Access-Control-Allow-Origin", "https://YOUR_FRONTEND_URL"); // for production
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Handle preflight OPTIONS request (CORS)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  // ─────────────────────────────

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { userId, message } = req.body || {};

    // For testing, use hardcoded agentId.
    console.log('User ID:', userId);
    const agentId = await getAgentIdForUser(userId);
    console.log('Using agentId:', agentId);
    // const agentId = "agent-dfda8c45-9284-46a6-adef-047bf4f0657c";

    if (!agentId || !message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Missing agentId or message' });
    }

    console.log('Received request:', { userId, agentId, message });

    // Actually call Letta
    const response = await letta.agents.messages.create(agentId, {
      messages: [{ role: 'user', content: message + constant}],
    });

    console.log('Response from Letta:', response);

    const assistantReply =
      response.messages.find((m) => m.messageType === 'assistant_message')
        ?.content ?? '';

    // Check for <continue> or <end> tag at the end
    const trimmedReply = assistantReply.trim();
    if (trimmedReply.endsWith('<continue>')) {
      // Return everything except the <continue> tag
      const replyWithoutTag = trimmedReply.replace(/<continue>\s*$/, '').trim();
      return res.status(200).json({ reply: replyWithoutTag, status: 'continue' });
    } else if (trimmedReply.endsWith('<end>')) {
      // Return only the <end> tag
      return res.status(200).json({ reply: '<end>', status: 'end' });
    }

    // Default: return the full reply
    return res.status(200).json({ reply: assistantReply, status: null });
  } catch (err) {
    console.error('Error in /api/chat:', err);
    return res
      .status(500)
      .json({ error: 'Internal server error', detail: err.message });
  }
}