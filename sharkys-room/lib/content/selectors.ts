import type { ContentDomain, DeepReadonly, RoomContent, ScreenSummary } from './types';
/** Deterministic editor order; ASCII stable ID is the explicit tie breaker. */
export function ordered<T extends { readonly id: string; readonly order: number }>(rows: readonly T[]): T[] {
  return [...rows].sort((a, b) => a.order - b.order || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}
const short = (text: string) => {
  const characters = Array.from(text.replace(/\s+/g, ' ').trim());
  return characters.length > 80 ? characters.slice(0, 79).join('') + '…' : characters.join('');
};
/** Derived preview only. Full text is retained by detail queries. No screen runtime binding. */
export function screenSummary(data: DeepReadonly<RoomContent>, domain: ContentDomain): ScreenSummary {
  if (domain === 'projects') return { domain, title: 'Projects', count: data.projects.length, text: short(ordered(data.projects)[0]?.summary ?? '') };
  if (domain === 'profile') return { domain, title: 'About / Education', count: Number(data.profile.about !== null) + data.profile.education.length,
    text: short(data.profile.about?.headline ?? ordered(data.profile.education)[0]?.program ?? '') };
  if (domain === 'memories') return { domain, title: 'Memories', count: data.memories.reduce((n, a) => n + a.images.length, 0),
    text: short(ordered(data.memories).find(a => a.images.length)?.title ?? ordered(data.memories)[0]?.title ?? '') };
  if (domain !== 'contact') throw new RangeError('Unknown content domain');
  const channels = ordered(data.contact.channels);
  return { domain, title: 'Contact', count: channels.length, text: short(data.contact.intro ?? channels.find(c => c.preferred)?.label ?? channels[0]?.label ?? '') };
}
