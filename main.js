import { AGENT_IDS, CONVO_LENGTH, INIT_PROMPT, PERSONAS } from "./Agents/config.js";
import { setPersona, resetMessages } from "./Agents/agents.js";
import { runConversation } from "./Agents/conversation.js";
import { summarizeAndReset } from "./Agents/summary.js";

async function main() {
  await Promise.all(AGENT_IDS.map((id, i) =>
    setPersona(id, PERSONAS[i])
  ));

  await Promise.all(AGENT_IDS.map(resetMessages));

  await runConversation(AGENT_IDS[0], AGENT_IDS[1], CONVO_LENGTH, INIT_PROMPT);

  await summarizeAndReset(AGENT_IDS);
}

main().catch(console.error);
