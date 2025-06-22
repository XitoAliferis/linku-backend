import { VoyageAIClient } from 'voyageai';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import {
  getProfilesForConnect,
  getConnections as getRecommendedMatches,
  insertConnectionRecord,
  updateLastConnectedAt
} from '../Database/database.js';
import { setPersona } from '../Agents/agents.js';
import { clearConversation, runConversation, summarizeConversationHistory } from '../Agents/conversation.js';
import { CONVO_LENGTH, INIT_PROMPT } from '../Agents/config.js';

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
    console.log('hi')
    // Always run full match pipeline
    await matchPipeline();

    const now = new Date().toISOString();

    // Check for manual override
    const manualProfile = req.body && req.body.id && req.body.agent_id
      ? req.body
      : null;

    const profilesToProcess = [];

    if (manualProfile) {
      profilesToProcess.push(manualProfile);
      console.log(`🔧 Manual run for profile ${manualProfile.id}`);
    } else {
      // Scheduled batch mode
      const profiles = await getProfilesForConnect();
      const shuffled = profiles.sort(() => Math.random() - 0.5);
      const eligible = shuffled.filter(p => {
        const freq = p.connect_frequency_per_day;
        const hoursBetween = 24 / freq;
        if (!p.last_connected_at) return true;
        const hoursSince = (new Date() - new Date(p.last_connected_at)) / 1000 / 3600;
        return hoursSince >= hoursBetween;
      });

      const BATCH_SIZE = 1;
      profilesToProcess.push(...eligible.slice(0, BATCH_SIZE));
    }

    for (const profile of profilesToProcess) {
      setPersona(profile.agent_id, profile.core_memories);
      const matches = await getRecommendedMatches(profile.id);

      for (const conn of matches) {
        try {
          await runConversation(profile.agent_id, profile.id, conn.agent_id, conn.id, CONVO_LENGTH, INIT_PROMPT);
          await summarizeConversationHistory(profile.agent_id, conn.agent_id);
          await summarizeConversationHistory(conn.agent_id, profile.agent_id);
          clearConversation(profile.agent_id, conn.agent_id);
          await insertConnectionRecord(profile.id, conn.id);
        } catch (e) {
          console.error(`❌ Error connecting ${profile.id}↔${conn.id}:`, e.message);
        }
      }

      await updateLastConnectedAt(profile.id, now);
      console.log(`✅ Connected user ${profile.id}`);
    }

    res.status(200).json({
      message: `Matched and connected ${profilesToProcess.length} user(s).`
    });
  } catch (err) {
    console.error('❌ match+connect error:', err);
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
}



//matchPipeline();