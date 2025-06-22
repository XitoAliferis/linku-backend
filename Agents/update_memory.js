import { client, getAgent, getPersona } from '../Agents/agents.js'; // LettaClient
import { supabase } from '../Database/supabase.js';

export async function updateUserCoreMemoryFromHistory(userId) {
  try {
    // 1. Get user profile and current memory
    const { data: profile, error: profErr } = await supabase
      .from('profiles')
      .select('agent_id, core_memories, full_name')
      .eq('id', userId)
      .single();

    if (profErr || !profile) {
      console.error('Failed to fetch user profile:', profErr?.message);
      return;
    }

    const currentMemory = profile.core_memories || '';
    const fullName = profile.full_name || 'This user';

    // 2. Fetch all included user-authored messages
    const { data: messages, error: msgErr } = await supabase
      .from('user_messages')
      .select('content')
      .eq('sender_id', userId)
      .eq('is_ai_generated', false)
      .eq('included_in_memory', true);

    if (msgErr) {
      console.error('Error fetching messages:', msgErr.message);
      return;
    }

    // 3. Fetch all included user-authored posts
    const { data: posts, error: postErr } = await supabase
      .from('posts')
      .select('content')
      .eq('user_id', userId)
      .eq('is_ai_generated', false)
      .eq('included_in_memory', true);

    if (postErr) {
      console.error('Error fetching posts:', postErr.message);
      return;
    }

    const allRelevantText = [
      ...messages.map(m => m.content),
      ...posts.map(p => p.content)
    ].join('\n');

    if (!allRelevantText.trim()) {
      console.warn(`No memory-eligible content found for user ${userId}`);
      return;
    }

    // 4. Call memory editor agent
    const memoryEditorAgentId = 'agent-7c544722-18df-459f-a40a-18e4c4a01a25';
    const prompt = `
Here are new things the you have written in posts and messages that could be reflected in their memory:
---
${allRelevantText}
---

Update the memory if needed to include these ideas while keeping it concise, personal, and in the third person as if describing the user. Make sure to be thorough and not add or change things due to minor pieces of context in messages are posts, it s`;


    const response = await client.agents.messages.create(profile.agent_id, {
        messages: [{ role: "user", content: prompt }]
    });

    let newMemory = await getPersona(profile.agent_id)

    newMemory = newMemory.value

    if (!newMemory) {
      console.error('Failed to generate updated memory');
      return;
    }

    // 5. Save new memory
    const { error: updateErr } = await supabase
      .from('profiles')
      .update({ core_memories: newMemory })
      .eq('id', userId);

    if (updateErr) {
      console.error('Error saving updated core memory:', updateErr.message);
    } else {
      console.log(`✅ Updated core memory for user ${userId}`);
    }
  } catch (err) {
    console.error('❌ updateUserCoreMemoryFromHistory error:', err.message);
  }
}

