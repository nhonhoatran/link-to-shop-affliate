import fs from 'node:fs';
import path from 'node:path';
import { REPO_ROOT } from './env';

export interface E2EOutfitItem {
  name: string;
  description: string;
  url: string;
  file: string;
  anchor: { x: number; y: number };
}

/** Written by the admin flow so the public and cleanup steps know which outfit this run owns. */
export interface E2EOutfitState {
  outfitId: string;
  slug: string;
  title: string;
  items: E2EOutfitItem[];
}

const STATE_FILE = path.join(REPO_ROOT, 'test-results', 'e2e-outfit-state.json');

export function writeOutfitState(state: E2EOutfitState): void {
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

export function readOutfitStateOrNull(): E2EOutfitState | null {
  if (!fs.existsSync(STATE_FILE)) return null;
  return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) as E2EOutfitState;
}

export function readOutfitState(): E2EOutfitState {
  const state = readOutfitStateOrNull();
  if (!state) throw new Error('No e2e outfit state: the admin-flow project must run first');
  return state;
}

export function clearOutfitState(): void {
  fs.rmSync(STATE_FILE, { force: true });
}
