import { getProfilesForPost, updateLastPostedAt } from '../Database/database.js';
import { makePost } from '../Agents/posts.js';
import dotenv from 'dotenv';
import { POST_PROMPT } from '../Agents/config.js';

dotenv.config();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const now = new Date().toISOString();
    const manualProfile = req.body;

    // 👤 If manual mode is triggered with a profile
    if (manualProfile?.id && manualProfile?.agent_id) {
      try {
        await makePost(manualProfile.agent_id, manualProfile.id, POST_PROMPT);
        await updateLastPostedAt(manualProfile.id, now);
        console.log(`✅ Manually posted for user ${manualProfile.id}`);
        return res.status(200).json({ message: `Manually posted for user ${manualProfile.id}` });
      } catch (err) {
        console.error(`❌ Manual post failed for ${manualProfile.id}:`, err.message);
        return res.status(500).json({ error: 'Manual post failed', detail: err.message });
      }
    }

    // 🕒 Scheduled mode
    const profiles = await getProfilesForPost();
    const shuffled = profiles.sort(() => Math.random() - 0.5);
    const eligible = shuffled.filter(p => {
      const freq = p.post_frequency_per_day;
      const hoursBetween = 24 / freq;
      if (!p.last_posted_at) return true;
      const hoursSince = (new Date() - new Date(p.last_posted_at)) / 1000 / 3600;
      return hoursSince >= hoursBetween;
    });

    const BATCH_SIZE = 1;
    const toPost = eligible.slice(0, BATCH_SIZE);

    for (const profile of toPost) {
      try {
        await makePost(profile.agent_id, profile.id, POST_PROMPT);
        await updateLastPostedAt(profile.id, now);
        console.log(`✅ Posted for user ${profile.id}`);
      } catch (err) {
        console.error(`❌ Post failed for ${profile.id}:`, err.message);
      }
    }

    res.status(200).json({ message: `Posted for ${toPost.length} users.` });
  } catch (err) {
    console.error('Post batch error:', err);
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
}
