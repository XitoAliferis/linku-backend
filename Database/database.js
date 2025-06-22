// Database/database.js
import { supabase } from './supabase.js';

/**
 * Posting helpers
 */
export async function getProfilesForPost() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, agent_id, post_frequency_per_day, last_posted_at')
    .not('agent_id', 'is', null)
    .gt('post_frequency_per_day', 0);

  if (error) {
    console.error('Error fetching profiles for post:', error.message);
    return [];
  }
  return data;
}

export async function updateLastPostedAt(userId, timestamp) {
  const { error } = await supabase
    .from('profiles')
    .update({ last_posted_at: timestamp })
    .eq('id', userId);

  if (error) {
    console.error(`Error updating last_posted_at for ${userId}:`, error.message);
  }
}

export async function insertPost(user_id, content, is_ai_generated = true) {
  const { data, error } = await supabase
    .from('posts')
    .insert([{ user_id, content, is_ai_generated }]);

  if (error) console.error('Insert post error:', error.message);
  return data;
}

/**
 * Matching / connection helpers
 */
export async function getConnections(userId) {
  const { data: matches, error } = await supabase
    .from('user_matches')
    .select('matched_user_ids')
    .eq('user_id', userId)
    .single();

  if (error || !matches?.matched_user_ids) {
    console.error("❌ Failed to fetch matches:", error?.message);
    return [];
  }

  const ids = matches.matched_user_ids.reverse();
  const profiles = [];

  for (const id of ids) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, agent_id, core_memories, connect_frequency_per_day, last_connected_at')
      .eq('id', id)
      .single();

    if (error) {
      console.warn(`⚠️ Could not fetch profile for ID ${id}:`, error.message);
      continue;
    }
    profiles.push(data);
  }
  return profiles;
}

/**
 * Conversation summaries & messages
 */
export async function insertSummary(agent1_id, agent2_id, summary) {
  const { data, error } = await supabase
    .from('conversation_summaries')
    .insert([{ agent1_id, agent2_id, summary }]);
  if (error) console.error('Insert summary error:', error.message);
  return data;
}

export async function insertMessage(
  sender_id,
  recipient_id,
  content,
  read = false,
  is_ai_generated = true
) {
  const { data, error } = await supabase
    .from('user_messages')
    .insert([{ sender_id, recipient_id, content, read, is_ai_generated }]);
  if (error) console.error('Insert message error:', error.message);
  return data;
}

/**
 * Connection insertion & scheduling
 */
export async function getProfilesForConnect() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, agent_id, core_memories, connect_frequency_per_day, last_connected_at')
    .not('agent_id', 'is', null)
    .gt('connect_frequency_per_day', 0);

  if (error) {
    console.error('Error fetching profiles for connect:', error.message);
    return [];
  }
  return data;
}

export async function insertConnectionRecord(user1, user2) {
  const [userA, userB] = [user1, user2].sort();

  const { data: existing, error: chkErr } = await supabase
    .from('connections')
    .select('user_id_1, user_id_2')
    .eq('user_id_1', userA)
    .eq('user_id_2', userB)
    .limit(1);

  if (chkErr) {
    console.error('❌ Error checking existing connection:', chkErr.message);
    return;
  }

  if (existing && existing.length > 0) {
    return;
  }
  const { error: insErr } = await supabase
    .from('connections')
    .insert([{ user_id_1: userA, user_id_2: userB }]);

  if (insErr) {
    console.error('❌ Error inserting connection record:', insErr.message);
  } else {
    console.log(`✅ Connection inserted: ${userA} ↔ ${userB}`);
  }
}


export async function updateLastConnectedAt(userId, timestamp) {
  const { error } = await supabase
    .from('profiles')
    .update({ last_connected_at: timestamp })
    .eq('id', userId);

  if (error) {
    console.error(`Error updating last_connected_at for ${userId}:`, error.message);
  }
}
