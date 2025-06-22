import dotenv from 'dotenv';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../.env') });

export const TOKEN = process.env.LETTA_API_TOKEN;

export function getToken() {
  return process.env.LETTA_API_TOKEN;
}

export const AGENT_IDS = [
  "agent-b2f24900-0779-4b13-ba95-a8978fcf2d01",
  "agent-e1fa2749-253b-43bf-b9c9-09c9cfc68744"
];

export const SUMMARIZING_AGENT_ID = 'agent-c1025e41-1bec-4d45-a06b-24419e2c633f';

export const CONVO_LENGTH = 1;
export const INIT_PROMPT = "Hello, introduce yourself, then ask me to introduce myself";

export const POST_PROMPT = `You're my personalized agent, designed to think and speak exactly like me. 
I want you to write a single, short tweet — no more than 20 words.

It should sound like something I would actually post: casual, smart, maybe a little weird or specific, but real. 
Avoid anything generic, inspirational, or try-hard. Don’t explain the tweet — just write it. 
You can reference my mood, my interests, something I might be thinking about, or even something random that feels like it came from my head.

Stay true to my tone. It should feel like me in a moment, not content for someone else.

Just the tweet — one line. No hashtags. No emojis.`;
