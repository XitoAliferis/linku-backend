import { LettaClient } from '@letta-ai/letta-client'
const client = new LettaClient({ token: "sk-let-YTg3MTMwZDctODU5Yi00ZWM0LThmMTUtMzlmNTUyZmM4MTdlOjU3NjkyYjRjLTRlN2EtNDZhYy1hNDIzLTk2ZmRmNmUxNWJmNA==" });

const list = [
    'agent-d98d6d1f-e647-475f-953d-1df9718f293a',
    'agent-44ee9c58-da25-4de8-8c2a-61c7ed9b17d9',
]

for (let l of list){
    await client.agents.delete(l)
    console.log('deleted ', l)
}