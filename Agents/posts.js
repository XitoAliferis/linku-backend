import { insertPost } from "../Database/database.js";
import { sendMessage } from "./conversation.js";

export async function makePost(agent, agent_id, prompt) {
    let post = await sendMessage(agent, prompt);
    await insertPost(agent_id, post, true);
}
