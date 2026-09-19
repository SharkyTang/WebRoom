import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readApprovedContent } from '../lib/content/source.server';
import { createContentRepository } from '../lib/content/repository';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const result = await readApprovedContent(root);
if (result.status === 'error') {
  console.error(JSON.stringify(result, null, 2)); process.exitCode = 1;
} else {
  const repository = createContentRepository(result);
  console.log(JSON.stringify({ status: 'valid', schemaVersion: result.data.site.schemaVersion, contentRevision: result.data.site.contentRevision,
    counts: { projects: result.data.projects.length, about: Number(result.data.profile.about !== null), education: result.data.profile.education.length, albums: result.data.memories.length,
      images: result.data.memories.reduce((n,a) => n + a.images.length, 0), contacts: result.data.contact.channels.length, media: result.data.media.length },
    summaries: ['projects', 'profile', 'memories', 'contact'].map(domain => repository.getScreenSummary(domain as 'projects' | 'profile' | 'memories' | 'contact')),
  }, null, 2));
}
