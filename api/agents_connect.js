import { CONVO_LENGTH, INIT_PROMPT, POST_PROMPT } from '../Agents/config.js';
import {
  clearConversation,
  runConversation,
  summarizeConversationHistory
} from '../../Agents/conversation.js';
import { getConnections } from '../../Database/database.js';
import { makePost } from '../../Agents/posts.js';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);


export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const profile = req.body;

    if (!profile || !profile.agent_id || !profile.id || !profile.core_memories) {
      return res.status(400).json({ error: 'Invalid profile data' });
    }

    setPersona(profile.agent_id, profile.core_memories);
    const connections = await getConnections(profile.id);

    for (const connection of connections) {
      console.log(`Starting conversation with ${connection.full_name}`);
      await runConversation(
        profile.agent_id,
        profile.id,
        connection.agent_id,
        connection.id,
        CONVO_LENGTH,
        INIT_PROMPT
      );
      await summarizeConversationHistory(profile.agent_id, connection.agent_id);
      await summarizeConversationHistory(connection.agent_id, profile.agent_id);
      clearConversation(profile.agent_id, connection.agent_id);
      const { data: existing, error: checkError } = await supabase
        .from('connections')
        .select('id')
        .or(
          `and(user_id_1.eq.${profile.id},user_id_2.eq.${connection.id}),and(user_id_1.eq.${connection.id},user_id_2.eq.${profile.id})`
        )
        .limit(1);

      if (!existing || existing.length === 0) {
        const { error: insertError } = await supabase
          .from('connections')
          .insert([{ user_id_1: profile.id, user_id_2: connection.id }]);

      if (insertError) {
          console.error(`Failed to insert connection: ${insertError.message}`);
        } else {
          console.log(`Connection created between ${profile.id} and ${connection.id}`);
        }
      } else {
        console.log(`Connection already exists between ${profile.id} and ${connection.id}`);
      }
    }
    

    await makePost(profile.agent_id, profile.id, POST_PROMPT);

    res.status(200).json({ message: 'Agent conversations complete.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error', detail: err.message });
  }
}
