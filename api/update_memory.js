import { updateUserCoreMemoryFromHistory } from '../Agents/update_memory.js';
import { supabase } from '../Database/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { data: users, error } = await supabase
      .from('profiles')
      .select('id')
      .not('agent_id', 'is', null);

    if (error) {
      console.error('❌ Failed to fetch user IDs:', error.message);
      return res.status(500).json({ error: 'Failed to fetch users' });
    }

    for (const user of users) {
      await updateUserCoreMemoryFromHistory(user.id);
    }

    res.status(200).json({ message: `✅ Updated memory for ${users.length} users.` });
  } catch (err) {
    console.error('❌ update_memory scheduler error:', err.message);
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
}
