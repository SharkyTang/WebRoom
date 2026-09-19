// Node-only boundary: this file must never be imported by a client component.
import { createHash } from 'node:crypto';
import { lstat, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import type { ApprovalRegister, ContentIssue, DeepReadonly, Media, RoomContent, ValidationResult } from './types';
import { freezeContent, validateContent } from './validate';

/** Key order does not affect approval; array order, values and optional fields do. */
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(canonicalJson).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + canonicalJson((value as Record<string, unknown>)[k])).join(',') + '}';
  return JSON.stringify(value);
}
export const contentDigest = (value: unknown) => createHash('sha256').update(canonicalJson(value)).digest('hex');
export function approvalEntries(data: DeepReadonly<RoomContent>): { key: string; value: unknown }[] {
  return [
    ...data.projects.map(value => ({ key: `projects/${value.id}`, value })),
    ...(data.profile.about ? [{ key: 'profile/about', value: data.profile.about }] : []),
    ...data.profile.education.map(value => ({ key: `education/${value.id}`, value })),
    ...data.memories.map(value => ({ key: `memories/${value.id}`, value })),
    ...(data.contact.intro ? [{ key: 'contact/intro', value: data.contact.intro }] : []),
    ...data.contact.channels.map(value => ({ key: `contact/${value.id}`, value })),
    ...data.media.map(value => ({ key: `media/${value.id}`, value })),
  ];
}
export function validateApprovals(data: DeepReadonly<RoomContent>, input: unknown): ContentIssue[] {
  const error = (at: string, code: string, message: string): ContentIssue => ({ path: at, code, message });
  if (!input || typeof input !== 'object' || Array.isArray(input)) return [error('approvals', 'approval-register', 'Expected a local approval register')];
  const register = input as ApprovalRegister;
  if (register.schemaVersion !== 1 || !Array.isArray(register.grants) || Object.keys(register).some(k => !['schemaVersion', 'grants'].includes(k))) return [error('approvals', 'approval-register', 'Invalid approval register schema')];
  const issues: ContentIssue[] = [], grants = new Map<string, ApprovalRegister['grants'][number]>();
  register.grants.forEach((g, i) => {
    const at = `approvals.grants[${i}]`;
    if (!g || typeof g !== 'object' || Object.keys(g).some(k => !['key','status','revision','sha256','approvedOn','evidence'].includes(k)) ||
      typeof g.key !== 'string' || !/^(projects|profile|education|memories|contact|media)\/[a-z][a-z0-9-]*$/.test(g.key) || g.status !== 'approved' ||
      typeof g.revision !== 'string' || !/^[a-z][a-z0-9-]*$/.test(g.revision) || typeof g.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(g.sha256) ||
      typeof g.approvedOn !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(g.approvedOn) || !Number.isFinite(Date.parse(g.approvedOn)) || new Date(g.approvedOn).toISOString().slice(0,10) !== g.approvedOn ||
      typeof g.evidence !== 'string' || !/^[a-z][a-z0-9-]*$/.test(g.evidence)) {
      issues.push(error(at, 'approval-register', 'Invalid grant: only approved version hashes and local evidence IDs are accepted')); return;
    }
    if (grants.has(g.key)) issues.push(error(at, 'duplicate-grant', 'Duplicate approval key'));
    grants.set(g.key, g);
  });
  const entries = approvalEntries(data), required = new Set(entries.map(e => e.key));
  for (const { key, value } of entries) {
    const grant = grants.get(key);
    if (!grant || grant.revision !== data.site.contentRevision || grant.sha256 !== contentDigest(value)) issues.push(error(key, 'not-approved', 'No matching approval for this exact public record and content revision'));
  }
  for (const key of grants.keys()) if (!required.has(key)) issues.push(error(key, 'stale-grant', 'Move historical approval to the register history after removing a record'));
  return issues;
}

function imageSize(bytes: Buffer, mime: string): [number, number] | null {
  if (mime === 'image/png' && bytes.length >= 33 && bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) && bytes.toString('ascii',12,16) === 'IHDR') return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
  if (mime === 'image/jpeg' && bytes.length > 4 && bytes[0] === 255 && bytes[1] === 216) {
    let offset = 2;
    while (offset + 4 <= bytes.length) {
      if (bytes[offset++] !== 255) return null;
      while (bytes[offset] === 255) offset++;
      const marker = bytes[offset++];
      if (marker === 217 || marker === 218) break;
      if (marker === 1 || (marker >= 208 && marker <= 215)) continue;
      if (offset + 2 > bytes.length) return null;
      const length = bytes.readUInt16BE(offset);
      if (length < 2 || offset + length > bytes.length) return null;
      if ([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker) && length >= 8) return [bytes.readUInt16BE(offset + 5), bytes.readUInt16BE(offset + 3)];
      offset += length;
    }
  }
  if (mime === 'image/webp' && bytes.length >= 30 && bytes.toString('ascii',0,4) === 'RIFF' && bytes.toString('ascii',8,12) === 'WEBP') {
    const kind = bytes.toString('ascii',12,16);
    if (kind === 'VP8X') return [1 + bytes.readUIntLE(24,3), 1 + bytes.readUIntLE(27,3)];
    if (kind === 'VP8 ' && bytes.subarray(23,26).equals(Buffer.from([157,1,42]))) return [bytes.readUInt16LE(26) & 0x3fff, bytes.readUInt16LE(28) & 0x3fff];
    if (kind === 'VP8L' && bytes[20] === 47) return [1 + (bytes.readUInt32LE(21) & 0x3fff), 1 + ((bytes.readUInt32LE(21) >> 14) & 0x3fff)];
  }
  return null;
}
async function inspectFile(publicRoot: string, media: DeepReadonly<Media>, at: string): Promise<ContentIssue[]> {
  const issue = (code: string, message: string): ContentIssue[] => [{ path: at, recordId: media.id, code, message }];
  try {
    let current = path.resolve(publicRoot);
    if ((await lstat(current)).isSymbolicLink()) return issue('symlink', 'Public root must not be a symbolic link');
    for (const part of media.path.slice(1).split('/')) {
      current = path.join(current, part);
      if ((await lstat(current)).isSymbolicLink()) return issue('symlink', 'Public media path must not traverse symbolic links');
    }
    const stat = await lstat(current);
    if (!stat.isFile()) return issue('media-file', 'Public media must be a regular file');
    if (stat.size !== media.bytes) return issue('media-bytes', 'Actual file size differs from approved metadata');
    const bytes = await readFile(current);
    if (createHash('sha256').update(bytes).digest('hex') !== media.sha256) return issue('media-hash', 'File bytes differ from the approved asset version');
    if (media.kind === 'document') return bytes.subarray(0,5).toString() === '%PDF-' ? [] : issue('media-format', 'Expected a PDF header');
    const size = imageSize(bytes, media.mimeType);
    if (!size) return issue('media-format', 'Unsupported or invalid image header');
    return size[0] === media.width && size[1] === media.height ? [] : issue('media-dimensions', 'Actual dimensions differ from approved metadata');
  } catch { return issue('media-file', 'Public media is missing or unreadable'); }
}
/** Fail closed: no partially valid/approved data is returned and no raw values enter errors. */
export async function validatePublication(input: unknown, approvals: unknown, publicRoot: string): Promise<ValidationResult> {
  const result = validateContent(input);
  if (result.status === 'error') return result;
  const issues = validateApprovals(result.data, approvals);
  // Do not inspect paths from an unapproved collection.
  if (issues.length) return { status: 'error', issues: freezeContent(issues) };
  for (const [i, media] of result.data.media.entries()) issues.push(...await inspectFile(publicRoot, media, `media[${i}]`));
  // Also reject unregistered files: deleting a JSON reference must not leave a public original.
  const registered = new Set(result.data.media.map(m => m.path));
  async function walk(dir: string, url: string) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) await walk(path.join(dir, entry.name), `${url}/${entry.name}`);
      else if (entry.isSymbolicLink() || !registered.has(`${url}/${entry.name}`)) issues.push({ path: 'media', code: 'unregistered-file', message: 'Unregistered or symbolic-link entry exists under public/content; inspect locally' });
    }
  }
  try {
    const dir = path.join(publicRoot, 'content');
    const s = await lstat(dir);
    if (s.isSymbolicLink() || !s.isDirectory()) issues.push({ path: 'media', code: 'symlink', message: 'public/content must be a real directory' });
    else await walk(dir, '/content');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') issues.push({ path: 'media', code: 'media-file', message: 'Cannot inspect public/content' });
  }
  return issues.length ? { status: 'error', issues: freezeContent(issues) } : result;
}
