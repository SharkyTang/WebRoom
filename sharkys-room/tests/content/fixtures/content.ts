/** TEST ONLY — entirely synthetic, never personal facts, never import from product code. */
import type { RoomContent } from '../../../lib/content/types';
import { createHash } from 'node:crypto';
import { approvalEntries, contentDigest } from '../../../lib/content/publication.server';
export const TEST_SENTINEL = 'TEST_ONLY_V07A_SYNTHETIC_NEVER_PUBLISH';
export const TEST_IMAGE = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jf1sAAAAASUVORK5CYII=', 'base64');
export function emptyContent(): RoomContent {
  return { site: { schemaVersion: 1, contentRevision: 'test-only-r1' }, projects: [], profile: { about: null, education: [] }, memories: [], contact: { intro: null, channels: [] }, media: [] };
}
export function minimalContent(): RoomContent {
  const c = emptyContent();
  c.projects = [{ id: 'test-project', title: TEST_SENTINEL, order: 1, summary: 'TEST ONLY summary', projectStatus: 'concept', role: 'TEST ONLY role', technologies: [], overview: ['TEST ONLY context'], contribution: ['TEST ONLY contribution'] }];
  return c;
}
export function fullContent(): RoomContent {
  const c = minimalContent();
  c.media = ['project','portrait','memory'].map(purpose => ({ id: `test-${purpose}-media`, path: `/content/test/${purpose}.png`, kind: 'image', mimeType: 'image/png',
    width: 1, height: 1, bytes: TEST_IMAGE.length, sha256: createHash('sha256').update(TEST_IMAGE).digest('hex'), purpose: purpose as 'project' | 'portrait' | 'memory', alt: 'TEST ONLY synthetic one-pixel fixture' }));
  Object.assign(c.projects[0], { date: { start: { precision: 'year', value: '2024' }, end: { precision: 'month', value: '2025-03' } },
    outcomes: ['TEST ONLY outcome'], coverMediaId: 'test-project-media', galleryMediaIds: ['test-project-media'],
    links: [{ kind: 'article', label: 'TEST ONLY URL syntax; never requested', url: 'https://www.iana.org/domains/reserved' }],
    limitations: ['TEST ONLY limitation'], nextSteps: ['TEST ONLY next step'], tags: ['test'], featured: true });
  c.profile = { about: { displayName: TEST_SENTINEL, headline: 'TEST ONLY headline', aboutParagraphs: ['TEST ONLY paragraph'], portraitMediaId: 'test-portrait-media', interests: ['TEST ONLY interest'], skills: [], resumeUrl: 'https://www.iana.org/domains/reserved' },
    education: [{ id: 'test-education', institution: 'TEST ONLY institution', program: 'TEST ONLY program', status: 'studying', order: 0, start: { precision: 'year', value: '2024' }, end: { precision: 'month', value: '2028-06', estimated: true }, description: ['TEST ONLY course'] }] };
  c.memories = [{ id: 'test-album', title: 'TEST ONLY album', order: 0, description: 'TEST ONLY fixture, not a personal memory', dateLabel: '2024', coverImageId: 'test-image', images: [{ id: 'test-image', mediaId: 'test-memory-media', order: 0, alt: 'TEST ONLY one-pixel fixture', caption: 'TEST ONLY caption', dateLabel: '2024', locationLabel: 'TEST ONLY fictional label' }] }];
  c.contact = { intro: 'TEST ONLY contact text', channels: [{ id: 'test-email', type: 'email', label: 'TEST ONLY email', order: 0, value: 'test-only@iana.org', url: 'mailto:test-only@iana.org', allowCopy: true, preferred: true, description: 'TEST ONLY address syntax fixture; do not contact' }] };
  return c;
}
/** Synthetic approvals are test-local and never evidence of user approval. */
export function testApprovals(c: RoomContent) {
  return { schemaVersion: 1 as const, grants: approvalEntries(c).map(({key, value}) => ({ key, status: 'approved' as const, revision: c.site.contentRevision, sha256: contentDigest(value), approvedOn: '2026-09-19', evidence: 'test-only-approval' })) };
}
