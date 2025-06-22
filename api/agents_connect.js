import { CONVO_LENGTH, INIT_PROMPT, POST_PROMPT } from '../../Agents/config.js';
import { setPersona } from '../../Agents/agents.js';
import {
  clearConversation,
  runConversation,
  summarizeConversationHistory
} from '../../Agents/conversation.js';
import { getConnections } from '../../Database/database.js';
import { makePost } from '../../Agents/posts.js';

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
    }

    await makePost(profile.agent_id, profile.id, POST_PROMPT);

    res.status(200).json({ message: 'Agent conversations complete.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error', detail: err.message });
  }
}
