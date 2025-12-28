import fs from 'node:fs';
import fsp from 'node:fs/promises';
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
    await fsp.access(p);
    return true;
  } catch {
    return false;
  }
}

async function scanDir(dirPath, out) {
  const entries = await fsp.readdir(dirPath, { withFileTypes: true });
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

function decodeUtf16LE(buffer) {
  const start = buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe ? 2 : 0;
  return buffer.slice(start).toString('utf16le');
}

function decodeUtf16BE(buffer) {
  const start = buffer.length >= 2 && buffer[0] === 0xfe && buffer[1] === 0xff ? 2 : 0;
  const slice = buffer.slice(start);
  const swapped = Buffer.alloc(slice.length);
  for (let i = 0; i + 1 < slice.length; i += 2) {
    swapped[i] = slice[i + 1];
    swapped[i + 1] = slice[i];
  }
  return swapped.toString('utf16le');
}

function getBackupPath(filePath) {
  let backupPath = `${filePath}.bak`;
  if (!fs.existsSync(backupPath)) {
    return backupPath;
  }
  let index = 1;
  while (fs.existsSync(`${filePath}.bak${index}`)) {
    index += 1;
  }
  return `${filePath}.bak${index}`;
}

function placeholderFor(filePath) {
  const relPath = path.relative(process.cwd(), filePath).replace(/\\/g, '/');
  if (relPath === 'app/page.tsx') {
    return `export default function Home() {\n  return (\n    <main style={{ padding: 24 }}>\n      <h1>Cutz By Casper</h1>\n      <p>Site is running.</p>\n    </main>\n  );\n}\n`;
  }

  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.tsx':
    case '.jsx':
      return `export default function Placeholder() {\n  return null;\n}\n`;
    case '.ts':
    case '.js':
    case '.mjs':
      return 'export {};\n';
    case '.cjs':
      return 'module.exports = {};\n';
    case '.json':
      return '{}\n';
    case '.css':
      return '/* placeholder */\n';
    case '.md':
      return '# Placeholder\n';
    case '.env':
      return '# placeholder\n';
    case '.sql':
      return '-- placeholder\n';
    case '.yml':
    case '.yaml':
      return '# placeholder\n';
    default:
      return '// placeholder\n';
  }
}

async function main() {
  const root = process.cwd();
  const files = [];

  const rootEntries = await fsp.readdir(root, { withFileTypes: true });
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

  const warnings = [];
  for (const filePath of files) {
    const buffer = await fsp.readFile(filePath);
    const result = detectEncoding(buffer);

    if (result.kind === 'utf8' || result.kind === 'empty') {
      continue;
    }

    if (result.kind === 'utf8_bom') {
      await fsp.writeFile(filePath, buffer.slice(3));
      console.log(`Rewrote UTF-8 BOM: ${path.relative(root, filePath)}`);
      continue;
    }

    if (result.kind === 'utf16le' || result.kind === 'utf16be') {
      const decoded = result.kind === 'utf16le' ? decodeUtf16LE(buffer) : decodeUtf16BE(buffer);
      await fsp.writeFile(filePath, Buffer.from(decoded, 'utf8'));
      console.log(`Converted ${result.kind} to UTF-8: ${path.relative(root, filePath)}`);
      continue;
    }

    if (result.kind === 'invalid_utf8') {
      const backupPath = getBackupPath(filePath);
      await fsp.copyFile(filePath, backupPath);
      const placeholder = placeholderFor(filePath);
      await fsp.writeFile(filePath, Buffer.from(placeholder, 'utf8'));
      warnings.push(path.relative(root, filePath));
      console.warn(`Replaced invalid file with placeholder: ${path.relative(root, filePath)}`);
      continue;
    }
  }

  if (warnings.length > 0) {
    console.warn('Files replaced due to invalid/corrupt encoding:');
    for (const file of warnings) {
      console.warn(`- ${file}`);
    }
  }
}

main().catch((error) => {
  console.error('fix-encoding failed:', error);
  process.exit(2);
});