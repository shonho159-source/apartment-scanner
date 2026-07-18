import { readFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(__dirname, '..', '..');

function loadJson(relPath) {
  return JSON.parse(readFileSync(join(ROOT, relPath), 'utf8'));
}

export const groupsConfig = loadJson('config/groups.json');
export const criteria = loadJson('config/criteria.json');

const dataDir = join(ROOT, 'data');
mkdirSync(dataDir, { recursive: true });

export const paths = {
  seen: join(dataDir, 'seen.json'),
  history: join(dataDir, 'history.jsonl'),
  lastRun: join(dataDir, 'last-run.json'),
};
