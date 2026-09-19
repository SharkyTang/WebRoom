// Local, read-only file loader. No route, debug endpoint, dynamic import or client barrel.
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { ValidationResult } from './types';
import { validatePublication } from './publication.server';
export async function readApprovedContent(projectRoot: string): Promise<ValidationResult> {
  const data: Record<string, unknown> = {};
  for (const name of ['site', 'projects', 'profile', 'memories', 'contact', 'media']) {
    try { data[name] = JSON.parse(await readFile(path.join(projectRoot, 'content/room', `${name}.json`), 'utf8')); }
    catch { return { status: 'error', issues: [{ path: name, code: 'source-file', message: 'Content JSON is missing, unreadable or invalid' }] }; }
  }
  let approvals: unknown;
  try { approvals = JSON.parse(await readFile(path.join(projectRoot, 'docs/content/approved-records.json'), 'utf8')); }
  catch { return { status: 'error', issues: [{ path: 'approvals', code: 'source-file', message: 'Local approval register is missing, unreadable or invalid' }] }; }
  return validatePublication(data, approvals, path.join(projectRoot, 'public'));
}
