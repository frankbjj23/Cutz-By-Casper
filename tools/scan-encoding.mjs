import fs from 'node:fs/promises';
import path from 'node:path';
import { TextDecoder } from 'node:util';

const TARGET_DIRS = ['app', 'components', 'lib', 'tests', 'tools'];
const EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.json', '.css', '.md', '.env', '.sql', '.yml', '.yaml'
]);

function isEnvLike(name) {
  return name === '.env' || name.startsWith('.env.');
}

function hasSupportedExtension(filePath) {
  const name = path.basename(filePath);
  const ext = path.extname(filePath).toLowerCase();
  return EXTENSIONS.has(ext) || isEnvLike(name);
}

async function pathExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function scanDir(dirPath, out) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      await scanDir(fullPath, out);
      continue;
    }
    if (entry.isFile() && hasSupportedExtension(fullPath)) {
      out.push(fullPath);
    }
  }
}

function detectEncoding(buffer) {
  if (buffer.length === 0) {
    return { kind: 'empty', reason: 'empty-file' };
  }

  if (buffer.length >= 2) {
    if (buffer[0] === 0xff && buffer[1] === 0xfe) {
      return { kind: 'utf16le', reason: 'bom' };
    }
    if (buffer[0] === 0xfe && buffer[1] === 0xff) {
      return { kind: 'utf16be', reason: 'bom' };
    }
  }

  const hasUtf8Bom = buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf;

  let nulls = 0;
  let evenNulls = 0;
  let oddNulls = 0;
  for (let i = 0; i < buffer.length; i += 1) {
    if (buffer[i] === 0x00) {
      nulls += 1;
      if (i % 2 === 0) {
        evenNulls += 1;
      } else {
        oddNulls += 1;
      }
    }
  }

  if (nulls / buffer.length > 0.2) {
    const kind = evenNulls > oddNulls ? 'utf16be' : 'utf16le';
    return { kind, reason: 'high-null-ratio' };
  }

  try {
    const decoder = new TextDecoder('utf-8', { fatal: true });
    decoder.decode(buffer);
  } catch (error) {
    return { kind: 'invalid_utf8', reason: String(error) };
  }

  if (hasUtf8Bom) {
    return { kind: 'utf8_bom', reason: 'utf8-bom' };
  }

  return { kind: 'utf8', reason: 'ok' };
}

async function main() {
  const root = process.cwd();
  const files = [];

  const rootEntries = await fs.readdir(root, { withFileTypes: true });
  for (const entry of rootEntries) {
    if (entry.isFile()) {
      const fullPath = path.join(root, entry.name);
      if (hasSupportedExtension(fullPath)) {
        files.push(fullPath);
      }
    }
  }

  for (const dir of TARGET_DIRS) {
    const dirPath = path.join(root, dir);
    if (await pathExists(dirPath)) {
      await scanDir(dirPath, files);
    }
  }

  const suspicious = [];
  for (const filePath of files) {
    const buffer = await fs.readFile(filePath);
    const result = detectEncoding(buffer);
    if (result.kind !== 'utf8' && result.kind !== 'empty') {
      suspicious.push({ filePath, result });
    }
  }

  if (suspicious.length === 0) {
    console.log('No suspicious files found.');
    process.exit(0);
  }

  console.log('Suspicious files:');
  for (const item of suspicious) {
    const relPath = path.relative(root, item.filePath);
    console.log(`- ${relPath} (${item.result.kind}: ${item.result.reason})`);
  }

  process.exit(1);
}

main().catch((error) => {
  console.error('scan-encoding failed:', error);
  process.exit(2);
});