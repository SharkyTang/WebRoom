/** v0.7A data contracts. No dependency on room state, rendering or device runtime. */
export type DeepReadonly<T> = T extends object ? { readonly [K in keyof T]: DeepReadonly<T[K]> } : T;
export type PartialDate = { precision: 'year' | 'month' | 'day'; value: string; estimated?: boolean };
export type DateRange = { start?: PartialDate; end?: PartialDate; ongoing?: boolean };
export type ContentLink = { kind: 'code' | 'demo' | 'article' | 'website'; label: string; url: string };
export type ProjectStatus = 'completed' | 'in-progress' | 'concept' | 'paused';
export interface Project {
  id: string; title: string; order: number; summary: string; projectStatus: ProjectStatus;
  role: string; technologies: string[]; overview: string[]; contribution: string[];
  date?: DateRange; outcomes?: string[]; coverMediaId?: string; galleryMediaIds?: string[];
  links?: ContentLink[]; limitations?: string[]; nextSteps?: string[]; tags?: string[]; featured?: boolean;
}
export interface About {
  displayName: string; headline: string; aboutParagraphs: string[];
  portraitMediaId?: string; interests?: string[]; skills?: string[];
  resumeMediaId?: string; resumeUrl?: string;
}
export interface Education {
  id: string; institution: string; program: string; order: number;
  status: 'studying' | 'completed' | 'paused' | 'withdrawn';
  start?: PartialDate; end?: PartialDate; description?: string[];
}
export interface Profile { about: About | null; education: Education[] }
export interface MemoryImage {
  id: string; mediaId: string; order: number; alt: string;
  caption?: string; dateLabel?: string; locationLabel?: string;
}
export interface Album {
  id: string; title: string; order: number; images: MemoryImage[];
  description?: string; dateLabel?: string; coverImageId?: string;
}
export interface ContactChannel {
  id: string; type: 'email' | 'github' | 'linkedin' | 'website' | 'other'; label: string;
  order: number; value: string; url: string; allowCopy?: boolean; description?: string; preferred?: boolean;
}
export interface Contact { intro: string | null; channels: ContactChannel[] }
export interface Media {
  id: string; path: string; kind: 'image' | 'document';
  mimeType: 'image/png' | 'image/jpeg' | 'image/webp' | 'application/pdf';
  width: number | null; height: number | null; bytes: number; sha256: string;
  purpose: 'project' | 'portrait' | 'memory' | 'resume'; alt: string;
  thumbnailMediaId?: string;
}
export interface RoomContent {
  site: { schemaVersion: 1; contentRevision: string };
  projects: Project[]; profile: Profile; memories: Album[]; contact: Contact; media: Media[];
}
export interface ContentIssue { path: string; code: string; message: string; recordId?: string }
export type ContentError = { status: 'error'; issues: readonly ContentIssue[] };
export type ValidationResult = { status: 'ready'; data: DeepReadonly<RoomContent> } | ContentError;
export type QueryResult<T> = { status: 'ready' | 'empty'; data: DeepReadonly<T> } | ContentError;
export type DetailResult<T> = { status: 'ready'; data: DeepReadonly<T> } | {
  status: 'not-found'; entity: 'project' | 'album' | 'image' | 'media'; id: string;
} | ContentError;
export type ContentDomain = 'projects' | 'profile' | 'memories' | 'contact';
export interface ScreenSummary { domain: ContentDomain; title: string; count: number; text: string }
/** Local approval ledger contains identifiers and hashes only; never draft text/original paths. */
export interface ApprovalRegister {
  schemaVersion: 1;
  grants: { key: string; status: 'approved'; revision: string; sha256: string; approvedOn: string; evidence: string }[];
}
