import { supabase } from "./supabase.js";

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
      .select('*')
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

export async function insertSummary(agent1_id, agent2_id, summary) {
  let { data, error } = await supabase
    .from('conversation_summaries')
    .insert([
      { agent1_id, agent2_id, summary }
    ])

  if (error) {
    console.error('Insert error:', error)
  } else {
    console.log('Insert success:', data)
  }
}

export async function insertMessage(sender_id, recipient_id, content, read = false, is_ai_generated = true) {
  const { data, error } = await supabase
    .from('user_messages')
    .insert([
      { sender_id, recipient_id, content, read, is_ai_generated }
    ]);

  if (error) {
    console.error('Insert error:', error);
  } else {
    console.log('Insert success:', data);
  }
}

export async function insertPost(user_id, content, is_ai_generated = true) {
  const { data, error } = await supabase
    .from('posts')
    .insert([
      { user_id, content, is_ai_generated}
    ]);

  if (error) {
    console.error('Insert error:', error);
  } else {
    console.log('Insert success:', data);
  }
}