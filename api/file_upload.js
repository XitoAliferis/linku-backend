// /api/file-upload.js

import { IncomingForm } from 'formidable';
import { LettaClient } from '@letta-ai/letta-client';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// disable default body parsing so we can stream the form
export const config = { api: { bodyParser: false } };

// Initialize Letta + Supabase clients
const letta = new LettaClient({ baseUrl: process.env.LETTA_BASE_URL });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function getAgentIdForUser(userId) {
  const { data, error } = await supabase
    .from('user_agents')
    .select('agent_id')
    .eq('user_id', userId)
    .single();
  if (error) throw error;
  return data.agent_id;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  const form = new IncomingForm();
  form.parse(req, async (err, fields, files) => {
    if (err) {
      return res.status(500).json({ error: 'Error parsing form data' });
    }

    try {
      const { userId } = fields;
      const agentId = await getAgentIdForUser(userId);
      if (!agentId) {
        return res.status(404).json({ error: 'Agent not found' });
      }

      const file = files.file;
      if (!file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const fileStream = fs.createReadStream(file.filepath);
      const uploadResult = await letta.agents.files.ingest(agentId, {
        file: fileStream,
        fileName: file.originalFilename,
      });

      fs.unlinkSync(file.filepath);
      return res.json({ status: 'ok', result: uploadResult });
    } catch (uploadErr) {
      console.error(uploadErr);
      return res
        .status(500)
        .json({ error: 'Failed to upload to Letta', detail: uploadErr.message });
    }
  });
}
