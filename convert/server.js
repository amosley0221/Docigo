/**
 * Docigo conversion service.
 *
 * Single endpoint, POST /convert, that accepts a multipart/form-data
 * upload with a `file` field and converts it to PDF using LibreOffice
 * headless. The PDF is returned in the response body.
 *
 * Auth: clients send the user's Supabase access token in the
 * Authorization header. The token is validated against Supabase before
 * any work happens, so the converter can't be used anonymously.
 */
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const PORT = Number(process.env.PORT) || 3000;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? '*')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const MAX_BYTES = Number(process.env.MAX_BYTES) || 25 * 1024 * 1024; // 25 MB
const SOFFICE_TIMEOUT_MS =
  Number(process.env.SOFFICE_TIMEOUT_MS) || 60_000;

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  // eslint-disable-next-line no-console
  console.warn('Missing SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY env vars.');
}

const supabase = createClient(
  SUPABASE_URL ?? '',
  SUPABASE_PUBLISHABLE_KEY ?? '',
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const app = express();
app.disable('x-powered-by');

app.use(
  cors({
    origin: ALLOWED_ORIGINS.includes('*') ? true : ALLOWED_ORIGINS,
    methods: ['POST', 'OPTIONS', 'GET'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400,
  }),
);

app.get('/healthz', (_req, res) => res.json({ ok: true }));

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) =>
      mkdtemp(join(tmpdir(), 'docigo-in-'))
        .then((dir) => cb(null, dir))
        .catch((err) => cb(err, '')),
    filename: (_req, file, cb) => cb(null, file.originalname || 'input.bin'),
  }),
  limits: { fileSize: MAX_BYTES },
});

async function authenticate(req, res) {
  const auth = req.headers.authorization;
  if (!auth || !auth.toLowerCase().startsWith('bearer ')) {
    res.status(401).json({ error: 'Missing bearer token' });
    return null;
  }
  const token = auth.slice(7).trim();
  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) {
      res.status(401).json({ error: 'Invalid token' });
      return null;
    }
    return data.user;
  } catch (err) {
    res.status(401).json({ error: 'Auth failed' });
    return null;
  }
}

function runSoffice(inputPath, outputDir) {
  return new Promise((resolve, reject) => {
    const proc = spawn(
      'soffice',
      [
        '--headless',
        '--norestore',
        '--nologo',
        '--nofirststartwizard',
        '--convert-to',
        'pdf',
        '--outdir',
        outputDir,
        inputPath,
      ],
      {
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, HOME: outputDir },
      },
    );

    const timer = setTimeout(() => {
      proc.kill('SIGKILL');
      reject(new Error('LibreOffice timed out'));
    }, SOFFICE_TIMEOUT_MS);

    let stderr = '';
    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    proc.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else reject(new Error(`soffice exited ${code}: ${stderr.trim()}`));
    });
    proc.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

app.post('/convert', upload.single('file'), async (req, res) => {
  const user = await authenticate(req, res);
  if (!user) {
    if (req.file) {
      rm(req.file.path, { force: true }).catch(() => {});
      rm(req.file.destination, { recursive: true, force: true }).catch(() => {});
    }
    return;
  }

  if (!req.file) {
    res.status(400).json({ error: 'Missing file field' });
    return;
  }

  const inputPath = req.file.path;
  const inputDir = req.file.destination;
  const outputDir = await mkdtemp(join(tmpdir(), 'docigo-out-'));

  try {
    await runSoffice(inputPath, outputDir);
    const files = await readdir(outputDir);
    const pdf = files.find((f) => f.toLowerCase().endsWith('.pdf'));
    if (!pdf) {
      res.status(500).json({ error: 'LibreOffice produced no PDF' });
      return;
    }
    const buf = await readFile(join(outputDir, pdf));
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', String(buf.length));
    res.setHeader('Cache-Control', 'no-store');
    res.send(buf);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Conversion failed:', err);
    res
      .status(500)
      .json({ error: err instanceof Error ? err.message : 'Conversion failed' });
  } finally {
    rm(inputPath, { force: true }).catch(() => {});
    rm(inputDir, { recursive: true, force: true }).catch(() => {});
    rm(outputDir, { recursive: true, force: true }).catch(() => {});
  }
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`docigo-convert listening on :${PORT}`);
});
