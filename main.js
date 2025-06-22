import dotenv from 'dotenv';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../.env') });

import { CONVO_LENGTH, INIT_PROMPT, POST_PROMPT } from "./Agents/config.js";
import { setPersona, resetMessages } from "./Agents/agents.js";
import { clearConversation, runConversation, summarizeConversationHistory } from "./Agents/conversation.js";
import { getConnections } from "./Database/database.js";
import { makePost } from './Agents/posts.js';

const profile = {
  id: "b1017460-3c94-4129-9cca-b29b325d4b02",
  username: "xitoa",
  full_name: "Xristopher",
  avatar_url: "https://cdn.discordapp.com/avatars/213408562620137472/3b473b79a831b11de3e69bdc2eac6718.webp?size=160",
  bio: "maple syrup enthusiast 🍁",
  created_at: "2025-06-21T23:26:23.568882+00:00",
  updated_at: "2025-06-21T23:26:23.568882+00:00",
  location: "Ottawa, Canada",
  core_memories: "Xristopher, goes by Xito, is a 34-year-old investment analyst at a Denver-based venture capital firm, specializing in sustainable technology and clean energy startups. They combine their Harvard MBA education with a genuine passion for environmental causes, often hiking Colorado trails on weekends to clear their mind between deal evaluations. Their work involves analyzing pitch decks, conducting due diligence, and mentoring portfolio companies on scaling strategies. They're an avid reader of both business publications and nature writing, finding inspiration in books about entrepreneurship and wilderness conservation. While they enjoy outdoor activities like hiking and skiing, their primary focus remains on building a career that creates positive environmental impact through strategic investments. They regularly attend tech meetups and startup events, always looking for the next breakthrough in green technology.",
  agent_id: "agent-e1fa2749-253b-43bf-b9c9-09c9cfc68744",
  background_url: null
};

async function main(profile_row) {
  setPersona(profile_row.agent_id, profile_row.core_memories);
  let connection_profiles = await getConnections(profile_row.id);

  for (const connection of connection_profiles) {
    console.log("starting conversation with",connection.full_name)
    await runConversation(profile_row.agent_id, profile_row.id, connection.agent_id, connection.id, CONVO_LENGTH, INIT_PROMPT);
    await summarizeConversationHistory(profile_row.agent_id, connection.agent_id);
    await summarizeConversationHistory(connection.agent_id, profile_row.agent_id);
    clearConversation(profile_row.agent_id, connection.agent_id);
  }

}

//main(profile).catch(console.error);
makePost(profile.agent_id, profile.id, POST_PROMPT)