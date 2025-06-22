import { LettaClient } from '@letta-ai/letta-client'

const client = new LettaClient({ token: "" });


const person1 = `Jake is a 32-year-old graphic designer who lives in a medium-sized city. He enjoys biking on weekends, reading science fiction novels, and trying out new coffee spots around town. Jake has a dry sense of humor and values meaningful conversations over small talk. He volunteers once a month at a local animal shelter and prefers cozy get-togethers to large parties.`;

const person2 = `Maya is a 31-year-old elementary school teacher who also lives in the city. She's an avid reader, especially of speculative fiction, and enjoys spending her weekends exploring local parks or finding quiet cafés to unwind. Maya has a laid-back, thoughtful personality and enjoys connecting with others through shared hobbies and good conversation. She occasionally fosters rescue animals and is always up for a bike ride when the weather is nice.`;

const person3 = 'Bob is a 3 month old, does not speak and only crys and whines'

await client.agents.blocks.modify(
    "agent-b2f24900-0779-4b13-ba95-a8978fcf2d01",
    "persona",
    {
        value: person1
    }
);
let agent_ids = ['agent-b2f24900-0779-4b13-ba95-a8978fcf2d01', 'agent-e1fa2749-253b-43bf-b9c9-09c9cfc68744']
await client.agents.messages.reset(id)
const agentState1 = await client.agents.retrieve(agent_ids[0])

const agentState2 = await client.agents.retrieve(agent_ids[1])

let nextMessage = "Hello, introduce yourself";

for (let i = 0; i < 3; i++) {
    const response1 = await client.agents.messages.create(agentState1.id, {
        messages: [{ role: "user", content: nextMessage }]
    });

    for (const msg of response1.messages) {
        if (msg.messageType === "assistant_message" && msg.content) {
            nextMessage = msg.content;
            console.log("Person1:", nextMessage);
        }
    }

    const response2 = await client.agents.messages.create(agentState2.id, {
        messages: [{ role: "user", content: nextMessage }]
    });

    for (const msg of response2.messages) {
        if (msg.messageType === "assistant_message" && msg.content) {
            nextMessage = msg.content;
            console.log("Person2:", nextMessage);
        }
    }
}

