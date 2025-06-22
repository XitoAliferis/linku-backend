import { TOKEN } from "./config.js";
import { LettaClient } from "@letta-ai/letta-client";

export const client = new LettaClient({ token: TOKEN });

export async function setPersona(agentId, persona) {
  return client.agents.blocks.modify(agentId, "persona", { value: persona });
}

export async function resetBlocks(agentId) {
  await client.agents.blocks.modify(agentId, "human", { value: '' });
  return client.agents.blocks.modify(agentId, "conversation_summary", { value: '' });
}

export async function resetMessages(agentId) {
  return client.agents.messages.reset(agentId);
}

export async function getAgent(agentId) {
  return client.agents.retrieve(agentId);
}
