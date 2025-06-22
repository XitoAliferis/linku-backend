import formidable from 'formidable';
import { LettaClient } from '@letta-ai/letta-client';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Disable Next.js/Vercel's default body parser for file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

const letta = new LettaClient({ baseUrl: process.env.LETTA_BASE_URL });
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function getAgentIdForUser(userId) {
  const { data, error } = await supabase
    .from('profiles')
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

  const form = new formidable.IncomingForm();

  form.parse(req, async (err, fields, files) => {
    if (err) {
      res.status(500).json({ error: 'Error parsing form data', detail: err.message });
      return;
    }

    const { userId } = fields;
    const agentId = await getAgentIdForUser(userId);
    if (!agentId) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }

    // 'file' is the form field name
    const file = files.file;
    if (!file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    try {
      // Read the file as a stream and send to Letta
      const fileStream = fs.createReadStream(file.filepath);

      const uploadResult = await letta.agents.files.ingest(agentId, {
        file: fileStream,
        fileName: file.originalFilename,
      });

      // Optionally, delete the temp file
      fs.unlink(file.filepath, () => {});

      // Return Letta’s upload result so frontend can display
      res.status(200).json({
        status: 'ok',
        lettaResult: uploadResult,
        fileName: file.originalFilename,
        agentId,
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to upload to Letta', detail: err.message });
    }
  });
}
