import { makePost } from '../Agents/posts.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { agent_id, agent, prompt } = req.body;

    if (!agent || !agent_id || !prompt) {
      return res.status(400).json({ error: 'Missing required fields: agent, agent_id, or prompt' });
    }

    await makePost(agent, agent_id, prompt);

    res.status(200).json({ message: 'Post created successfully' });
  } catch (err) {
    console.error('Error in agent_post:', err);
    res.status(500).json({ error: 'Internal server error', detail: err.message });
  }
}
