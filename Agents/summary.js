import { client, setPersona, resetMessages, resetBlocks } from "./agents.js";
import { summarizeConversationHistory } from "./conversation.js";
import { PERSONAS } from "./config.js";

export async function summarizeAndReset(agentIds) {
<<<<<<< HEAD
  for (let i = 0; i < agentIds.length; i++) {
    const id = agentIds[i];

    const summary = await summarizeConversationHistory(agentIds[0], agentIds[1]);
    console.log(`\n📘 Summary for Agent ${i + 1}:`, summary);

    await resetMessages(id);
    await setPersona(id, PERSONAS[i]);
    await resetBlocks(id);
  }
}
=======
  if (agentIds.length < 2) {
    console.warn("summarizeAndReset requires at least 2 agents.");
    return;
  }

  const [agent1, agent2] = agentIds;

  for (let i = 0; i < agentIds.length; i++) {
    const id = agentIds[i];
    const otherId = agentIds.find(a => a !== id); // get the other agent

    const summary = await summarizeConversationHistory(id, otherId);
    console.log(`\n📘 Summary for ${id}:`, summary);

    await resetMessages(id);

    if (PERSONAS[i]) {
      await setPersona(id, PERSONAS[i]);
    }

    await resetBlocks(id);
  }
}
>>>>>>> d2174e4b0fe873e09ce6b4a9031cd3654a518530
