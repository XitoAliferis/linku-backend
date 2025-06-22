import { client, setPersona, resetMessages, resetBlocks } from "./agents.js";
import { summarizeConversationHistory } from "./conversation.js";
import { PERSONAS } from "./config.js";

export async function summarizeAndReset(agentIds) {
  for (let i = 0; i < agentIds.length; i++) {
    const id = agentIds[i];

    const summary = await summarizeConversationHistory(agentIds[0], agentIds[1]);
    console.log(`\n📘 Summary for Agent ${i + 1}:`, summary);

    await resetMessages(id);
    await setPersona(id, PERSONAS[i]);
    await resetBlocks(id);
  }
}
