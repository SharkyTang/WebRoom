import type { ContentIssue, RoomContent, ValidationResult } from './types';

type Check = (value: unknown, path: string, issues: ContentIssue[], recordId?: string) => void;
const idPattern = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const issue = (issues: ContentIssue[], path: string, code: string, message: string, recordId?: string) => {
  issues.push({ path, code, message, ...(recordId ? { recordId } : {}) });
};
const rule = (test: (v: unknown) => boolean, code: string, message: string): Check =>
  (v, p, e, id) => { if (!test(v)) issue(e, p, code, message, id); };
const text = rule(v => typeof v === 'string' && v.trim().length > 0 && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(v), 'text', 'Expected non-empty plain text without control characters');
const id = rule(v => typeof v === 'string' && idPattern.test(v), 'id', 'Expected a stable lowercase ASCII ID');
const integer = (min: number) => rule(v => Number.isSafeInteger(v) && (v as number) >= min, 'integer', `Expected a safe integer >= ${min}`);
const boolean = rule(v => typeof v === 'boolean', 'boolean', 'Expected a boolean');
const enumeration = (...allowed: unknown[]) => rule(v => allowed.includes(v), 'enum', 'Value is outside the documented enum');
const optional = (check: Check): Check => (v, p, e, id) => { if (v !== undefined) check(v, p, e, id); };
const nullable = (check: Check): Check => (v, p, e, id) => { if (v !== null) check(v, p, e, id); };
const array = (check: Check, min = 0): Check => (v, p, e, id) => {
  if (!Array.isArray(v)) return issue(e, p, 'array', 'Expected an array', id);
  if (v.length < min) issue(e, p, 'required', 'Expected at least one item', id);
  v.forEach((entry, i) => check(entry, `${p}[${i}]`, e, id));
};
const object = (fields: Record<string, Check>): Check => (v, p, e, parentId) => {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return issue(e, p, 'object', 'Expected an object', parentId);
  const row = v as Record<string, unknown>;
  const recordId = typeof row.id === 'string' && idPattern.test(row.id) ? row.id : parentId;
  // Do not echo unknown keys: a mistakenly pasted private value can be a key too.
  if (Object.keys(row).some(key => !Object.hasOwn(fields, key))) issue(e, p, 'unknown-field', 'Unrecognized fields are not allowed in public content', recordId);
  for (const [key, check] of Object.entries(fields)) check(row[key], p ? `${p}.${key}` : key, e, recordId);
};
const texts = array(text);
const ids = array(id);

/** Syntactic public-link policy, not DNS/reachability or ownership verification. */
export function isPublicHttps(value: unknown): value is string {
  if (typeof value !== 'string' || !value.startsWith('https://') || /[\s\\\u0000-\u001f\u007f]/.test(value)) return false;
  try {
    const u = new URL(value), host = u.hostname.toLowerCase().replace(/\.$/, '');
    if (u.protocol !== 'https:' || u.username || u.password || (u.port && u.port !== '443')) return false;
    // All IP literals are intentionally excluded; do not resolve or probe any destination.
    if (host.includes(':') || /^[\d.]+$/.test(host) || !host.includes('.')) return false;
    if (!/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63}$/.test(host)) return false;
    if (/(^|\.)(localhost|local|internal|intranet|lan|home|test|invalid|example)$/.test(host)) return false;
    if (/(^|\.)example\.(com|org|net)$/.test(host)) return false;
    return true;
  } catch { return false; }
}
export function isPublicEmail(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 254 || !/^[A-Za-z0-9!$&'*+\-/=?^_`{|}~.]+@[A-Za-z0-9.-]+$/.test(value)) return false;
  const [local, host] = value.split('@');
  return local.length <= 64 && !local.startsWith('.') && !local.endsWith('.') && !local.includes('..') && isPublicHttps(`https://${host}`);
}
export function isContentPath(value: unknown): value is string {
  return typeof value === 'string' && /^\/content\/(?:[a-z0-9][a-z0-9_-]*\/)*[a-z0-9][a-z0-9_-]*\.(?:png|jpg|jpeg|webp|pdf)$/.test(value);
}
const https = rule(isPublicHttps, 'url', 'Expected an approved public HTTPS URL (no credentials, IP literals, local/reserved hosts or placeholder links)');
const mediaPath = rule(isContentPath, 'path', 'Expected a canonical /content/ path to a supported public derivative');
const digest = rule(v => typeof v === 'string' && /^[a-f0-9]{64}$/.test(v), 'sha256', 'Expected a lowercase SHA-256');
const partialDate: Check = (v, p, e, recordId) => {
  const before = e.length;
  object({ precision: enumeration('year', 'month', 'day'), value: text, estimated: optional(boolean) })(v, p, e, recordId);
  if (before !== e.length) return;
  const d = v as { precision: string; value: string };
  const pattern = d.precision === 'year' ? /^\d{4}$/ : d.precision === 'month' ? /^\d{4}-\d{2}$/ : /^\d{4}-\d{2}-\d{2}$/;
  const [year, month = 1, day = 1] = d.value.split('-').map(Number);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (!pattern.test(d.value) || year < 1 || month < 1 || month > 12 || day < 1 || day > days[month - 1]) issue(e, p, 'date', 'Date value must match its stated precision and calendar', recordId);
};
const link = object({ kind: enumeration('code', 'demo', 'article', 'website'), label: text, url: https });
const project = object({
  id, title: text, order: integer(0), summary: text, projectStatus: enumeration('completed', 'in-progress', 'concept', 'paused'),
  role: text, technologies: texts, overview: array(text, 1), contribution: array(text, 1),
  date: optional(object({ start: optional(partialDate), end: optional(partialDate), ongoing: optional(boolean) })),
  outcomes: optional(texts), coverMediaId: optional(id), galleryMediaIds: optional(ids), links: optional(array(link)),
  limitations: optional(texts), nextSteps: optional(texts), tags: optional(texts), featured: optional(boolean),
});
const about = object({ displayName: text, headline: text, aboutParagraphs: array(text, 1), portraitMediaId: optional(id),
  interests: optional(texts), skills: optional(texts), resumeMediaId: optional(id), resumeUrl: optional(https) });
const education = object({ id, institution: text, program: text, order: integer(0), status: enumeration('studying', 'completed', 'paused', 'withdrawn'),
  start: optional(partialDate), end: optional(partialDate), description: optional(texts) });
const memoryImage = object({ id, mediaId: id, order: integer(0), alt: text, caption: optional(text), dateLabel: optional(text), locationLabel: optional(text) });
const album = object({ id, title: text, order: integer(0), images: array(memoryImage), description: optional(text), dateLabel: optional(text), coverImageId: optional(id) });
const channel = object({ id, type: enumeration('email', 'github', 'linkedin', 'website', 'other'), label: text, order: integer(0), value: text,
  url: text, allowCopy: optional(boolean), description: optional(text), preferred: optional(boolean) });
const media = object({ id, path: mediaPath, kind: enumeration('image', 'document'), mimeType: enumeration('image/png', 'image/jpeg', 'image/webp', 'application/pdf'),
  width: nullable(integer(1)), height: nullable(integer(1)), bytes: integer(1), sha256: digest,
  purpose: enumeration('project', 'portrait', 'memory', 'resume'), alt: text, thumbnailMediaId: optional(id) });
const schema = object({ site: object({ schemaVersion: enumeration(1), contentRevision: id }), projects: array(project),
  profile: object({ about: nullable(about), education: array(education) }), memories: array(album),
  contact: object({ intro: nullable(text), channels: array(channel) }), media: array(media) });

function checkRange(range: { start?: { value: string }; end?: { value: string }; ongoing?: boolean }, path: string, issues: ContentIssue[], recordId?: string) {
  // Compare only shared known precision: 2024 to 2024-03 is not an invented January.
  if (range.start && range.end) {
    const n = Math.min(range.start.value.length, range.end.value.length);
    if (range.start.value.slice(0, n) > range.end.value.slice(0, n)) issue(issues, path, 'date-order', 'End precedes start at known precision', recordId);
  }
  if (range.ongoing && range.end) issue(issues, path, 'date-range', 'Ongoing range cannot also have a completed end', recordId);
}
export function freezeContent<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freezeContent); Object.freeze(value);
  }
  return value;
}
/** Structural validation only. Publication additionally requires the local approval/file gate. */
export function validateContent(input: unknown): ValidationResult {
  const issues: ContentIssue[] = [];
  schema(input, '', issues);
  if (issues.length) return { status: 'error', issues };
  const data = input as RoomContent;
  const seen = new Set<string>();
  const unique = (rows: { id: string }[], path: string) => rows.forEach((r, i) => {
    if (seen.has(r.id)) issue(issues, `${path}[${i}].id`, 'duplicate-id', 'IDs are globally unique across records', r.id);
    seen.add(r.id);
  });
  unique(data.projects, 'projects'); unique(data.profile.education, 'profile.education'); unique(data.memories, 'memories');
  data.memories.forEach((a, i) => unique(a.images, `memories[${i}].images`));
  unique(data.contact.channels, 'contact.channels'); unique(data.media, 'media');
  const mediaById = new Map(data.media.map(m => [m.id, m]));
  const ref = (value: string | undefined, path: string, purpose: string, recordId?: string) => {
    if (value === undefined) return;
    const m = mediaById.get(value);
    if (!m) issue(issues, path, 'reference', 'Referenced public media does not exist', recordId);
    else if (m.purpose !== purpose) issue(issues, path, 'media-purpose', 'Media is not approved for this use', recordId);
  };
  data.projects.forEach((p, i) => {
    const at = `projects[${i}]`;
    if (p.date) { checkRange(p.date, at + '.date', issues, p.id); if (!p.date.start && !p.date.end && !p.date.ongoing) issue(issues, at + '.date', 'date-range', 'Omit an unknown date instead of supplying an empty range', p.id); }
    if (p.date?.ongoing && p.projectStatus !== 'in-progress') issue(issues, at + '.date.ongoing', 'status-date', 'Ongoing requires an in-progress project', p.id);
    ref(p.coverMediaId, at + '.coverMediaId', 'project', p.id);
    p.galleryMediaIds?.forEach((m, j) => ref(m, `${at}.galleryMediaIds[${j}]`, 'project', p.id));
    for (const key of ['technologies', 'galleryMediaIds', 'tags'] as const) if (p[key] && new Set(p[key]).size !== p[key].length) issue(issues, `${at}.${key}`, 'duplicate-value', 'Repeated entries are not allowed', p.id);
  });
  const a = data.profile.about;
  if (a) { ref(a.portraitMediaId, 'profile.about.portraitMediaId', 'portrait'); ref(a.resumeMediaId, 'profile.about.resumeMediaId', 'resume'); }
  data.profile.education.forEach((e, i) => {
    checkRange(e, `profile.education[${i}]`, issues, e.id);
    if (e.status === 'studying' && e.end && !e.end.estimated) issue(issues, `profile.education[${i}].end`, 'estimated-date', 'A studying end date must be explicitly estimated', e.id);
    if (e.status === 'completed' && e.end?.estimated) issue(issues, `profile.education[${i}].end`, 'estimated-date', 'A completed end cannot be estimated', e.id);
  });
  data.memories.forEach((album, i) => {
    const at = `memories[${i}]`;
    if (album.images.length && !album.coverImageId) issue(issues, at + '.coverImageId', 'required', 'A non-empty album requires its own cover image', album.id);
    if (album.coverImageId && !album.images.some(im => im.id === album.coverImageId)) issue(issues, at + '.coverImageId', 'reference', 'Cover must belong to this album', album.id);
    if (!album.images.length && !album.description) issue(issues, at + '.description', 'required', 'An empty album requires an honest explanation', album.id);
    album.images.forEach((im, j) => ref(im.mediaId, `${at}.images[${j}].mediaId`, 'memory', im.id));
  });
  data.contact.channels.forEach((c, i) => {
    const valid = c.type === 'email' ? isPublicEmail(c.value) && c.url === `mailto:${c.value}` : isPublicHttps(c.url);
    if (!valid) issue(issues, `contact.channels[${i}].url`, 'url', 'Expected public HTTPS or an exact mailto of the approved email value', c.id);
    if (valid && ['github', 'linkedin'].includes(c.type)) {
      const h = new URL(c.url).hostname;
      if (c.type === 'github' ? h !== 'github.com' : !['linkedin.com', 'www.linkedin.com'].includes(h)) issue(issues, `contact.channels[${i}].url`, 'channel-host', 'Channel type and host disagree', c.id);
    }
  });
  if (data.contact.channels.filter(c => c.preferred).length > 1) issue(issues, 'contact.channels', 'preferred', 'At most one channel may be preferred');
  const paths = new Set<string>();
  data.media.forEach((m, i) => {
    const at = `media[${i}]`;
    if (paths.has(m.path)) issue(issues, at + '.path', 'duplicate-path', 'Register each public file once', m.id);
    paths.add(m.path);
    const ext = m.path.split('.').pop();
    const mime = ({ png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', pdf: 'application/pdf' } as Record<string, string>)[ext!];
    if (m.mimeType !== mime) issue(issues, at + '.mimeType', 'media-type', 'Extension and MIME type must match', m.id);
    if (m.kind === 'document' ? m.mimeType !== 'application/pdf' || m.width !== null || m.height !== null || m.purpose !== 'resume' : m.mimeType === 'application/pdf' || m.width === null || m.height === null || m.purpose === 'resume') issue(issues, at, 'media-type', 'Image/document dimensions, type and purpose disagree', m.id);
    if (m.thumbnailMediaId) {
      const t = mediaById.get(m.thumbnailMediaId);
      if (!t || t.id === m.id || t.kind !== 'image' || m.kind !== 'image' || t.purpose !== m.purpose || t.thumbnailMediaId) issue(issues, at + '.thumbnailMediaId', 'reference', 'Thumbnail must be a separate leaf image with the same approved purpose', m.id);
    }
  });
  if (issues.length) return { status: 'error', issues: freezeContent(issues) };
  // Own the copy: caller mutation cannot alter later queries or approval digests.
  return { status: 'ready', data: freezeContent(structuredClone(data)) };
}
