import dotenv from 'dotenv';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../.env') });

import { CONVO_LENGTH, INIT_PROMPT } from "./Agents/config.js";
import { setPersona, resetMessages } from "./Agents/agents.js";
import { clearConversation, runConversation, summarizeConversationHistory } from "./Agents/conversation.js";
import { getConnections } from "./Database/database.js";

const profile = {
  id: "07f93b86-95ed-4f10-ae57-2700b60710f8",
  username: "henry",
  full_name: "Henry",
  avatar_url: "https://cdn.discordapp.com/avatars/1101360658928381973/44eeadf628010ef7783f4b7987102133.webp?size=160",
  bio: "best dev in the world 🌎 ",
  created_at: "2025-06-21T22:13:47.641061+00:00",
  updated_at: "2025-06-21T22:13:47.641061+00:00",
  location: "Cupertino, CA",
  core_memories: `This individual, Henry, is a 29-year-old software engineer working at a Seattle tech startup, specializing in mobile app development and cloud infrastructure. They're passionate about combining their technical skills with outdoor adventures, often building apps to track hiking routes and share trail conditions with the local hiking community. Weekends are spent exploring Pacific Northwest trails, rock climbing at local crags, and mountain biking through forest paths. They recently completed a coding bootcamp on machine learning and are excited about applying AI to environmental conservation projects. Their ideal day involves morning standup meetings followed by afternoon climbing sessions and evening coding on personal projects. They value work-life balance, environmental sustainability, and building technology that connects people with nature.`,
  agent_id: "agent-726d7a76-45db-406f-a00e-c265dd2a2a8b"
};

async function main(profile_row) {
  setPersona(profile_row.agent_id, profile_row.core_memories);
  let connection_profiles = await getConnections(profile_row.id);

  for (const connection of connection_profiles) {
    console.log("starting conversation with",connection.full_name)
    await runConversation(profile_row.agent_id, connection.agent_id, CONVO_LENGTH, INIT_PROMPT);
    await summarizeConversationHistory(profile_row.agent_id, connection.agent_id);
    await summarizeConversationHistory(connection.agent_id, profile_row.agent_id);
    clearConversation(profile_row.agent_id, connection.agent_id);
  }

}

main(profile).catch(console.error);