import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, symlink, readFile, readdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateContent, isPublicHttps, isPublicEmail } from '../lib/content/validate';
import { validatePublication, validateApprovals, contentDigest } from '../lib/content/publication.server';
import { readApprovedContent } from '../lib/content/source.server';
import { createContentRepository } from '../lib/content/repository';
import { emptyContent, minimalContent, fullContent, testApprovals, TEST_IMAGE, TEST_SENTINEL } from './content/fixtures/content';
import type { RoomContent } from '../lib/content/types';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
async function withMedia(run: (c: RoomContent, publicRoot: string) => Promise<void>) {
  const tmp = await mkdtemp(path.join(os.tmpdir(), 'v07a-test-only-'));
  try {
    const c = fullContent();
    for (const m of c.media) { const file = path.join(tmp, m.path); await mkdir(path.dirname(file), { recursive: true }); await writeFile(file, TEST_IMAGE); }
    await run(c, tmp);
  } finally { await rm(tmp, { recursive: true, force: true }); }
}
const invalid = (c: unknown, code: string, field?: string) => {
  const r = validateContent(c); assert.equal(r.status, 'error');
  if (r.status === 'error') assert(r.issues.some(i => i.code === code && (!field || i.path.includes(field))), JSON.stringify(r));
};
test('empty product data is approved-empty, with four honest empty summaries and no contact actions', async () => {
  const r = await readApprovedContent(root); assert.equal(r.status, 'ready');
  if (r.status !== 'ready') return;
  assert.deepEqual(r.data.projects, []); assert.equal(r.data.profile.about, null); assert.deepEqual(r.data.media, []);
  const repo = createContentRepository(r);
  for (const q of [repo.listProjects(), repo.getProfile(), repo.getAbout(), repo.listEducation(), repo.listAlbums(), repo.listContacts(), repo.getContact()]) assert.equal(q.status, 'empty');
  for (const d of ['projects','profile','memories','contact'] as const) {
    const q = repo.getScreenSummary(d); assert.equal(q.status, 'empty'); assert.equal(q.data.count,0); assert.equal(q.data.text,'');
  }
});
test('minimal, full, and independent About/Education blocks preserve optional absence', () => {
  for (const c of [emptyContent(), minimalContent(), fullContent()]) assert.equal(validateContent(c).status, 'ready');
  const c = fullContent(); c.profile.about = null;
  const repo = createContentRepository(validateContent(c)); assert.equal(repo.getProfile().status, 'ready'); assert.equal(repo.getAbout().status, 'empty'); assert.equal(repo.listEducation().status, 'ready');
  c.profile = { about: fullContent().profile.about, education: [] };
  assert.equal(createContentRepository(validateContent(c)).listEducation().status, 'empty');
});
test('all project statuses are explicit; no optional fields are fabricated', () => {
  for (const status of ['completed','in-progress','concept','paused'] as const) { const c = minimalContent(); c.projects[0].projectStatus = status; assert.equal(validateContent(c).status,'ready'); }
  const q = createContentRepository(validateContent(minimalContent())).getProject('test-project');
  assert.equal(q.status,'ready'); if(q.status === 'ready') { assert(!('links' in q.data)); assert(!('date' in q.data)); assert(!('coverMediaId' in q.data)); }
});
const mutations: [string, (c: RoomContent) => void, string, string?][] = [
 ['missing required title', c => { delete (c.projects[0] as Partial<RoomContent['projects'][number]>).title; }, 'text', 'title'],
 ['empty paragraph list', c => {c.projects[0].overview=[];}, 'required', 'overview'],
 ['duplicate stable ID across domains', c => {c.profile.education[0].id=c.projects[0].id;}, 'duplicate-id'],
 ['illegal project state', c => {Object.assign(c.projects[0],{projectStatus:'published'});}, 'enum', 'projectStatus'],
 ['negative order', c => {c.projects[0].order=-1;}, 'integer', 'order'],
 ['fractional order', c => {c.projects[0].order=1.1;}, 'integer'],
 ['unsafe integer order', c => {c.projects[0].order=Number.MAX_SAFE_INTEGER+1;}, 'integer'],
 ['invalid ID', c => {c.projects[0].id='Title With Spaces';}, 'id'],
 ['broken image reference', c => {c.memories[0].images[0].mediaId='missing-media';}, 'reference', 'mediaId'],
 ['wrong media purpose', c => {c.projects[0].coverMediaId='test-memory-media';}, 'media-purpose'],
 ['cover outside album', c => {c.memories[0].coverImageId='missing-image';}, 'reference', 'coverImageId'],
 ['nonempty album missing cover', c => {delete c.memories[0].coverImageId;}, 'required'],
 ['empty album needs explanation', c => {c.memories[0].images=[];delete c.memories[0].coverImageId;delete c.memories[0].description;}, 'required'],
 ['path traversal', c => {c.media[0].path='/content/../private.png';}, 'path'],
 ['encoded path traversal', c => {c.media[0].path='/content/%2e%2e/private.png';}, 'path'],
 ['absolute file path', c => {c.media[0].path='/Users/test/private.png';}, 'path'],
 ['fake extension', c => {c.media[0].mimeType='image/jpeg';}, 'media-type'],
 ['cyclic thumbnail', c => {c.media[0].thumbnailMediaId=c.media[0].id;}, 'reference'],
 ['two preferred contacts', c => {c.contact.channels.push({...c.contact.channels[0],id:'test-email-two'});}, 'preferred'],
 ['email mismatch', c => {c.contact.channels[0].url='mailto:different@iana.org';}, 'url'],
 ['mail header injection', c => {c.contact.channels[0].url+='?bcc=private@iana.org';}, 'url'],
 ['wrong channel host', c => {Object.assign(c.contact.channels[0],{type:'github',url:'https://www.iana.org/'});}, 'channel-host'],
 ['private unexpected field', c => {Object.assign(c.projects[0],{privateNotes:'PRIVATE_DRAFT_SENTINEL'});}, 'unknown-field'],
 ['inaccurate date precision', c => {c.projects[0].date={start:{precision:'year',value:'2024-01-01'}};}, 'date'],
 ['invalid leap date', c => {c.projects[0].date={start:{precision:'day',value:'2023-02-29'}};}, 'date'],
 ['invalid month', c => {c.projects[0].date={start:{precision:'month',value:'2024-13'}};}, 'date'],
 ['date backwards', c => {c.projects[0].date={start:{precision:'year',value:'2025'},end:{precision:'year',value:'2024'}};}, 'date-order'],
 ['ongoing cannot have end', c => {c.projects[0].date!.ongoing=true;}, 'date-range'],
 ['studying end must be marked estimated', c => {c.profile.education[0].end!.estimated=false;}, 'estimated-date'],
 ['completed end cannot be estimated', c => {c.profile.education[0].status='completed';}, 'estimated-date'],
 ['null optional field is not missing', c => {Object.assign(c.projects[0],{coverMediaId:null});}, 'id'],
];
for (const [name, mutate, code, field] of mutations) test(`reject ${name} with field-specific error`, () => {const c=fullContent();mutate(c);invalid(c,code,field);});
test('calendar precision stays as provided and long details are never truncated', () => {
  const c=minimalContent();c.projects[0].date={start:{precision:'day',value:'2024-02-29'}};
  c.projects[0].overview=[TEST_SENTINEL.repeat(1000)];c.projects[0].summary='语句🌿'.repeat(100);
  const repo=createContentRepository(validateContent(c)),q=repo.getProject('test-project'),s=repo.getScreenSummary('projects');
  assert.equal(q.status,'ready'); if(q.status==='ready'){assert.equal(q.data.overview[0].length,c.projects[0].overview[0].length);assert.equal(q.data.date?.start?.value,'2024-02-29');}
  if(s.status!=='error'){assert(Array.from(s.data.text).length<=80);assert(c.projects[0].summary.startsWith(s.data.text.slice(0,-1)));}
});
const badUrls=['javascript:alert(1)','data:text/html,x','http://iana.org','//iana.org','#','https://localhost/','https://127.0.0.1/','https://127.1/','https://0x7f000001/','https://[::1]/','https://192.168.1.2/','https://10.0.0.1/','https://room.local/','https://server.internal/','https://example.com/','https://example.org/','https://private.example/','https://user:password@iana.org/','https://iana.org:3000/','https://iana.org\\@localhost','https://iana.org/\nsecret'];
for(const url of badUrls)test(`reject unsafe/reserved link ${JSON.stringify(url)}`,()=>assert.equal(isPublicHttps(url),false));
test('public HTTPS and exact mailto use no network lookups',()=>{assert(isPublicHttps('https://www.iana.org/domains/reserved?lang=en#title'));assert(isPublicEmail('test-only@iana.org'));assert(!isPublicEmail('test@example.com'));assert(!isPublicEmail('bad..name@iana.org'));});
test('stable sorting, known/unknown tag filters, compact summaries and no implicit first-detail fallback',()=>{
  const c=fullContent();c.projects.push({...c.projects[0],id:'test-a',title:'TEST ONLY A'});
  const repo=createContentRepository(validateContent(c)),q=repo.listProjects();
  if(q.status!=='error'){assert.deepEqual(q.data.map(p=>p.id),['test-a','test-project']);assert(!('overview' in q.data[0]));}
  assert.equal(repo.listProjects({tag:'missing'}).status,'empty');assert.equal(repo.listProjects({tag:'test'}).status,'ready');
  for(const q of [repo.getProject('missing'),repo.getAlbum('missing'),repo.getImage('test-album','missing'),repo.getImage('missing','test-image'),repo.getMedia('missing')])assert.equal(q.status,'not-found');
  for(const q of [repo.getAlbum('test-album'),repo.getImage('test-album','test-image'),repo.getMedia('test-memory-media')])assert.equal(q.status,'ready');
  const albums=repo.listAlbums();if(albums.status!=='error'){assert.equal(albums.data[0].imageCount,1);assert(!('images' in albums.data[0]));}
});
test('repository owns frozen copies and every error path remains error instead of empty',()=>{
  const c=minimalContent(),repo=createContentRepository(validateContent(c));c.projects[0].title='MUTATED';
  const q=repo.getProject('test-project');if(q.status==='ready'){assert.equal(q.data.title,TEST_SENTINEL);assert.throws(()=>{(q.data as {title:string}).title='MUTATED';});}
  const bad=createContentRepository(validateContent({private:'PRIVATE_DRAFT_SENTINEL'}));
  for(const q of [bad.listProjects(),bad.getProject('x'),bad.getProfile(),bad.getAbout(),bad.listEducation(),bad.listAlbums(),bad.getAlbum('x'),bad.getImage('x','y'),bad.getContact(),bad.listContacts(),bad.getMedia('x'),bad.getScreenSummary('projects')]){assert.equal(q.status,'error');assert(!JSON.stringify(q).includes('PRIVATE_DRAFT_SENTINEL'));assert(!('data' in q));}
});
test('all four summaries derive from the same approved text and contain no originals or long body',()=>{
  const c=fullContent(),repo=createContentRepository(validateContent(c));
  for(const [d,text,count]of [['projects',c.projects[0].summary,1],['profile',c.profile.about!.headline,2],['memories',c.memories[0].title,1],['contact',c.contact.intro,1]]as const){const q=repo.getScreenSummary(d);if(q.status!=='error'){assert.equal(q.data.text,text);assert.equal(q.data.count,count);assert.deepEqual(Object.keys(q.data),['domain','title','count','text']);}}
  c.projects[0].summary='TEST ONLY revised';assert.equal(createContentRepository(validateContent(c)).getScreenSummary('projects').status,'ready');
});
test('approval is bound to exact record, revision and image bytes; no draft data returned',async()=>{
  await withMedia(async(c,dir)=>{
    assert.equal((await validatePublication(c,testApprovals(c),dir)).status,'ready');
    const approved=testApprovals(c);c.projects[0].summary='PRIVATE_DRAFT_SENTINEL';
    const r=await validatePublication(c,approved,dir);assert.equal(r.status,'error');assert(!JSON.stringify(r).includes('PRIVATE_DRAFT_SENTINEL'));assert(!('data'in r));
    c.site.contentRevision='test-only-r2';assert(validateApprovals(c,approved).some(i=>i.code==='not-approved'));
    assert.equal((await validatePublication(c,{schemaVersion:1,grants:[]},dir)).status,'error');
  });
});
test('draft/needs-confirmation/missing are never publication grants',()=>{
  for(const status of ['draft','needs-confirmation','missing']){const c=minimalContent(),a=testApprovals(c);Object.assign(a.grants[0],{status});assert(validateApprovals(c,a).length>0);}
  const c=minimalContent(),a=testApprovals(c);a.grants.push(a.grants[0]);assert(validateApprovals(c,a).some(i=>i.code==='duplicate-grant'));
  assert.equal(contentDigest({b:2,a:1}),contentDigest({a:1,b:2}));
});
test('missing, stale, wrong dimensions and unknown public files are rejected',async()=>{
  await withMedia(async(c,dir)=>{
    c.media[0].bytes++;let r=await validatePublication(c,testApprovals(c),dir);assert(r.status==='error'&&r.issues.some(i=>i.code==='media-bytes'));c.media[0].bytes--;
    c.media[0].width=2;r=await validatePublication(c,testApprovals(c),dir);assert(r.status==='error'&&r.issues.some(i=>i.code==='media-dimensions'));c.media[0].width=1;
    c.media[0].sha256='0'.repeat(64);r=await validatePublication(c,testApprovals(c),dir);assert(r.status==='error'&&r.issues.some(i=>i.code==='media-hash'));
    await rm(path.join(dir,c.media[0].path));r=await validatePublication(c,testApprovals(c),dir);assert(r.status==='error'&&r.issues.some(i=>i.code==='media-file'));
    await writeFile(path.join(dir,'content/test/unapproved.txt'),'PRIVATE_DRAFT_SENTINEL');r=await validatePublication(emptyContent(),{schemaVersion:1,grants:[]},dir);assert(r.status==='error'&&r.issues.some(i=>i.code==='unregistered-file'));assert(!JSON.stringify(r).includes('PRIVATE_DRAFT_SENTINEL'));
  });
});
test('symbolic links cannot publish files outside the approved media directory',async()=>{
  await withMedia(async(c,dir)=>{const target=path.join(dir,c.media[0].path);await rm(target);await symlink(path.join(dir,c.media[1].path),target);const r=await validatePublication(c,testApprovals(c),dir);assert(r.status==='error'&&r.issues.some(i=>i.code==='symlink'));});
});
test('synthetic fixtures, Node-only approval code and content modules are not imported by room runtime',async()=>{
  async function files(dir:string):Promise<string[]>{const all=await readdir(dir,{withFileTypes:true});return(await Promise.all(all.map(e=>e.isDirectory()?files(path.join(dir,e.name)):[path.join(dir,e.name)]))).flat();}
  for(const dir of ['app','components','lib/room'])for(const f of await files(path.join(root,dir))){if(!/\.(ts|tsx|js)$/.test(f))continue;const s=await readFile(f,'utf8');assert(!/from\s+['"][^'"]*(?:lib\/content|content\/room|tests\/content)/.test(s),f);assert(!s.includes(TEST_SENTINEL),f);}
  for(const f of await files(path.join(root,'lib/content'))){const s=await readFile(f,'utf8');assert(!/from\s+['"][^'"]*(?:room\/|three|react|fixtures)/.test(s),f);}
  for(const f of await files(path.join(root,'content/room')))assert(!(await readFile(f,'utf8')).includes('TEST ONLY'));
});
test('unknown summary domain is an error, not a silent Contact fallback',()=>{
  const r=createContentRepository(validateContent(emptyContent())).getScreenSummary('unknown' as 'contact');
  assert.equal(r.status,'error');
});
test('missing/malformed source JSON returns redacted error instead of an empty successful repository',async()=>{
  const dir=await mkdtemp(path.join(os.tmpdir(),'v07a-source-test-'));
  try {
    let r=await readApprovedContent(dir);assert.equal(r.status,'error');
    await mkdir(path.join(dir,'content/room'),{recursive:true});
    await writeFile(path.join(dir,'content/room/site.json'),'{PRIVATE_DRAFT_SENTINEL');
    r=await readApprovedContent(dir);assert.equal(r.status,'error');assert(!JSON.stringify(r).includes('PRIVATE_DRAFT_SENTINEL'));
  } finally {await rm(dir,{recursive:true,force:true});}
});
