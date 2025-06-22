import { VoyageAIClient } from 'voyageai';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Supabase client
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error("Missing Supabase credentials in .env");
}

async function fetchUserData() {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('id, core_memories');

        if (error) throw error;
        return data;
    } catch (e) {
        console.log(`Error fetching users: ${e}`);
        return [];
    }
}


async function fetchUserObject() {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*');

        if (error) throw error;
        return data;
    } catch (e) {
        console.log(`Error fetching users: ${e}`);
        return [];
    }
}

async function fetchExistingConnections() {
    try {
        const { data, error } = await supabase
            .from('connections')
            .select('user_id_1, user_id_2');

        if (error) throw error;

        const connectionsSet = new Set();

        for (const conn of data) {
            const user1 = conn.user_id_1;
            const user2 = conn.user_id_2;
            connectionsSet.add(`${user1},${user2}`);
            connectionsSet.add(`${user2},${user1}`);
        }

        return connectionsSet;
    } catch (e) {
        console.log(`Error finding connected users: ${e}`);
        return new Set();
    }
}

function areUsersConnected(user1, user2, connectionsSet) {
    return connectionsSet.has(`${user1},${user2}`);
}

async function calculateEmbeddings(users) {
    const vo = new VoyageAIClient({ apiKey: process.env.VOYAGE_API_KEY });
    const embeddings = {};

    for (const user of users) {
        const userId = user.id;
        const summary = user.core_memories;

        if (summary) {
            try {
                const result = await vo.embed({
                    input: [summary],
                    model: 'voyage-3'
                });
                const embeddingVector = result.data[0].embedding;

                embeddings[userId] = embeddingVector;
            } catch (e) {
                console.log(`Error generating embedding for user ${userId}: ${e}`);
                continue;
            }
        }
    }

    return embeddings;
}

function calcSimilarity(a, b) {
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
function findMatchesForAll(users, embeddings, connectionsSet) {
    const allMatches = {};

    for (const user of users) {
        const userId = user.id;
        if (!(userId in embeddings)) {
            continue;
        }

        const userScores = [];

        for (const otherUser of users) {
            const otherId = otherUser.id;

            if (userId === otherId || !(otherId in embeddings)) {
                continue;
            }

            if (areUsersConnected(userId, otherId, connectionsSet)) {
                continue;
            }

            const score = calcSimilarity(embeddings[userId], embeddings[otherId]);

            userScores.push({
                user_id: otherId,
                score: score
            });
        }

        userScores.sort((a, b) => b.score - a.score);
        const topMatches = userScores.slice(0, 5);

        if (topMatches.length > 0) {
            allMatches[userId] = topMatches;
        }
    }

    return allMatches;
}

async function storeMatchesToSupabase(allMatches) {
    try {
        await supabase
            .from('user_matches')
            .delete()
            .neq('user_id', '00000000-0000-0000-0000-000000000000');

        const records = [];
        for (const [userId, matches] of Object.entries(allMatches)) {
            const matchedIds = matches.map(m => m.user_id);
            const similarityScores = matches.map(m => m.score);
            /*
            console.log(`Storing for user ${userId}:`);
            console.log(`  Matched IDs: ${matchedIds}`);
            console.log(`  Scores: ${similarityScores}`);
            */
            records.push({
                user_id: userId,
                matched_user_ids: matchedIds,
                similarity_scores: similarityScores
            });
        }

        const { error } = await supabase
            .from('user_matches')
            .insert(records);

        if (error) throw error;

        console.log(`Stored matches for ${records.length} users`);
        return true;
    } catch (e) {
        console.log(`Error storing matches: ${e}`);
        return false;
    }
}

async function matchPipeline() {
    const users = await fetchUserData();
    const existingConnections = await fetchExistingConnections();
    const embeddings = await calculateEmbeddings(users);
    const allMatches = findMatchesForAll(users, embeddings, existingConnections);
    await storeMatchesToSupabase(allMatches);
}

//execution
export default async function handler(req, res) {
    try {
        await matchPipeline();
        const profiles = await fetchUserObject()
        for (const profile of profiles) {
            try {
                const response = await fetch(`${process.env.BASE_URL}/api/agents_connect`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(profile)
                });
                const result = await response.json();
                console.log(`agents_connect ran for ${profile.id}:`, result.message || result);
            } catch (err) {
                console.error(`Failed to run agents_connect for ${profile.id}:`, err);
            }
        }
        res.status(200).json({ message: "Match pipeline executed successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
}


//matchPipeline();