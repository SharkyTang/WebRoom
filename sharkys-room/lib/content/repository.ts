import type { Album, About, Contact, ContactChannel, ContentDomain, DeepReadonly, DetailResult, Education, Media, MemoryImage, Profile, Project, QueryResult, ScreenSummary, ValidationResult } from './types';
import { freezeContent } from './validate';
import { ordered, screenSummary } from './selectors';
export type ProjectSummary = Pick<Project, 'id' | 'title' | 'order' | 'summary' | 'projectStatus' | 'tags' | 'featured' | 'coverMediaId'>;
export type AlbumSummary = Omit<Album, 'images'> & { imageCount: number };

/** Consume readApprovedContent()/validatePublication() output, never private drafts. */
export function createContentRepository(input: ValidationResult) {
  const source = freezeContent(structuredClone(input));
  const list = <T>(rows: DeepReadonly<T>[], present = rows.length > 0): QueryResult<T[]> => freezeContent({ status: present ? 'ready' : 'empty', data: rows }) as QueryResult<T[]>;
  const detail = <T>(rows: readonly DeepReadonly<T & { id: string }>[], id: string, entity: 'project' | 'album' | 'image' | 'media'): DetailResult<T> => {
    const found = rows.find(r => r.id === id);
    return found ? { status: 'ready', data: found } : { status: 'not-found', entity, id };
  };
  return Object.freeze({
    listProjects(options: { tag?: string } = {}): QueryResult<ProjectSummary[]> {
      if (source.status === 'error') return source;
      const rows = ordered(source.data.projects).filter(p => options.tag === undefined || p.tags?.includes(options.tag));
      return list<ProjectSummary>(rows.map(({ id, title, order, summary, projectStatus, tags, featured, coverMediaId }) => ({ id, title, order, summary, projectStatus,
        ...(tags ? { tags } : {}), ...(featured !== undefined ? { featured } : {}), ...(coverMediaId ? { coverMediaId } : {}) })));
    },
    getProject(id: string): DetailResult<Project> { return source.status === 'error' ? source : detail<Project>(source.data.projects, id, 'project'); },
    getProfile(): QueryResult<Profile> {
      if (source.status === 'error') return source;
      const p = source.data.profile;
      return freezeContent({ status: p.about || p.education.length ? 'ready' : 'empty', data: { about: p.about, education: ordered(p.education) } });
    },
    getAbout(): QueryResult<About | null> { return source.status === 'error' ? source : { status: source.data.profile.about ? 'ready' : 'empty', data: source.data.profile.about }; },
    listEducation(): QueryResult<Education[]> { return source.status === 'error' ? source : list<Education>(ordered(source.data.profile.education)); },
    listAlbums(): QueryResult<AlbumSummary[]> {
      if (source.status === 'error') return source;
      return list<AlbumSummary>(ordered(source.data.memories).map(({ images, ...a }) => ({ ...a, imageCount: images.length })));
    },
    getAlbum(id: string): DetailResult<Album> {
      if (source.status === 'error') return source;
      const found = source.data.memories.find(a => a.id === id);
      return found ? { status: 'ready', data: freezeContent({ ...found, images: ordered(found.images) }) } : { status: 'not-found', entity: 'album', id };
    },
    getImage(albumId: string, imageId: string): DetailResult<MemoryImage> {
      if (source.status === 'error') return source;
      const album = source.data.memories.find(a => a.id === albumId);
      return album ? detail<MemoryImage>(album.images, imageId, 'image') : { status: 'not-found', entity: 'album', id: albumId };
    },
    getContact(): QueryResult<Contact> {
      if (source.status === 'error') return source;
      const c = source.data.contact;
      return freezeContent({ status: c.intro || c.channels.length ? 'ready' : 'empty', data: { intro: c.intro, channels: ordered(c.channels) } });
    },
    listContacts(): QueryResult<ContactChannel[]> { return source.status === 'error' ? source : list<ContactChannel>(ordered(source.data.contact.channels)); },
    getMedia(id: string): DetailResult<Media> { return source.status === 'error' ? source : detail<Media>(source.data.media, id, 'media'); },
    getScreenSummary(domain: ContentDomain): QueryResult<ScreenSummary> {
      if (source.status === 'error') return source;
      if (!['projects', 'profile', 'memories', 'contact'].includes(domain)) return { status: 'error', issues: [{ path: 'domain', code: 'domain', message: 'Unknown content domain' }] };
      const data = screenSummary(source.data, domain);
      return freezeContent({ status: data.count || data.text ? 'ready' : 'empty', data });
    },
  });
}
