import { insertSummary } from "../Database/database.js";
import { client } from "./agents.js";
import { SUMMARIZING_AGENT_ID } from "./config.js";

export let conversationHistory = [];

/**
 * Runs a back-and-forth conversation between two agents.
 *
 * @param {string} agent1            - The first agent's ID.
 * @param {string} agent2            - The second agent's ID.
 * @param {number} turns             - Number of back-and-forth exchanges.
 * @param {string} initialPrompt     - The opening message.
 */
export async function runConversation(agent1, agent2, turns, initialPrompt) {
  let nextMessage = initialPrompt;
  let convo = getConversation(agent1, agent2);
  if (!convo) {
    convo = { agents: [agent1, agent2], messages: [] };
    conversationHistory.push(convo);
  }

  for (let i = 0; i < turns; i++) {
    nextMessage = await sendMessage(agent1, nextMessage);
    convo.messages.push({ speaker: agent1, message: nextMessage });

    nextMessage = await sendMessage(agent2, nextMessage);
    convo.messages.push({ speaker: agent2, message: nextMessage });
  }
}

/**
 * Finds the conversation record for a given pair of agents.
 *
 * @param {string} agent1
 * @param {string} agent2
 * @returns {{ agents: string[], messages: {speaker: string, message: string}[] }|undefined}
 */
function getConversation(agent1, agent2) {
  return conversationHistory.find(
    convo =>
      Array.isArray(convo.agents) &&
      convo.agents.includes(agent1) &&
      convo.agents.includes(agent2)
  );
}

/**
 * Sends a message to an agent and returns its reply.
 *
 * @param {string} agentId
 * @param {string} input
 * @returns {Promise<string>}        The agent's reply (or the input on fallback).
 */
async function sendMessage(agentId, input) {
  const response = await client.agents.messages.create(agentId, {
    messages: [{ role: "user", content: input }]
  });

  const reply = response.messages.find(
    msg => msg.messageType === "assistant_message" && msg.content
  );

  if (reply) {
    console.log(`${agentId}:`, reply.content);
    return reply.content;
  }

  // Fallback if no assistant_message found
  return input;
}

/**
 * Removes the conversation record for the given pair of agents.
 *
 * @param {string} agent1
 * @param {string} agent2
 */
export function clearConversation(agent1, agent2) {
  const idx = conversationHistory.findIndex(
    convo =>
      Array.isArray(convo.agents) &&
      convo.agents.includes(agent1) &&
      convo.agents.includes(agent2)
  );
  if (idx !== -1) {
    conversationHistory.splice(idx, 1);
  }
}

/**
 * Returns a formatted summary of all conversations.
 *
 * @returns {string}
 */
export async function summarizeConversationHistory(agent1, agent2) {
  const conversation = getConversation(agent1, agent2);

  if (!conversation) {
    return `No conversation found between ${agent1} and ${agent2}.`;
  }

  const dialogue = conversation.messages
    .map(m => `${m.speaker}: ${m.message}`)
    .join("\n");

  const prompt = `Summarize the following conversation in the perspective of ${agent1}:\n\n${dialogue}`;

  const response = await client.agents.messages.create(SUMMARIZING_AGENT_ID, {
    messages: [{ role: "user", content: prompt }]
  });

  const summary = response.messages.find(
    msg => msg.messageType === "assistant_message" && msg.content
  );

  await client.agents.messages.reset(SUMMARIZING_AGENT_ID);
  await insertSummary(agent1, agent2, summary.content);
  return summary?.content || `No summary generated for ${agent1}.`;
}
