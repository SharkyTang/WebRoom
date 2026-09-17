import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { BoxGeometry, Group, Mesh, MeshStandardMaterial, Texture } from 'three';
import { ownObjectResources } from '../lib/room/assets/resourceOwnership';

describe('v0.5 uncached asset resource ownership', () => {
  it('deduplicates shared geometry, material, texture and decoded images, and releases each exactly once', () => {
    const root = new Group();
    let imageCloses = 0;
    const image = { width: 512, height: 512, close: () => { imageCloses++; } };
    const texture = new Texture(image);
    const geometry = new BoxGeometry();
    const material = new MeshStandardMaterial({ map: texture, emissiveMap: texture });
    root.add(new Mesh(geometry, material), new Mesh(geometry, [material, material]));
    const disposed = { geometry: 0, material: 0, texture: 0 };
    geometry.addEventListener('dispose', () => { disposed.geometry++; });
    material.addEventListener('dispose', () => { disposed.material++; });
    texture.addEventListener('dispose', () => { disposed.texture++; });
    const owner = ownObjectResources(root);
    assert.deepEqual(owner.counts, { geometries: 1, materials: 1, textures: 1 });
    owner.dispose();
    owner.dispose();
    assert.deepEqual(disposed, { geometry: 1, material: 1, texture: 1 });
    assert.equal(imageCloses, 1);
  });

  it('captures ownership before export roots move under room anchors, preserving foreign source resources', () => {
    const asset = new Group();
    const visual = new Mesh(new BoxGeometry(), new MeshStandardMaterial());
    asset.add(visual);
    const room = new Group();
    const source = new Mesh(new BoxGeometry(), new MeshStandardMaterial());
    room.add(source);
    let sourceDisposals = 0;
    let productionDisposals = 0;
    source.geometry.addEventListener('dispose', () => { sourceDisposals++; });
    source.material.addEventListener('dispose', () => { sourceDisposals++; });
    visual.geometry.addEventListener('dispose', () => { productionDisposals++; });
    visual.material.addEventListener('dispose', () => { productionDisposals++; });
    const owner = ownObjectResources(asset);
    source.add(visual);
    assert.equal(asset.children.length, 0);
    owner.dispose();
    assert.equal(productionDisposals, 2);
    assert.equal(sourceDisposals, 0, 'The frozen room does not belong to a production family');
    source.geometry.dispose();
    source.material.dispose();
  });

  it('closes a shared decoded image once even when several textures use it', () => {
    let imageCloses = 0;
    const image = { width: 512, height: 512, close: () => { imageCloses++; } };
    const color = new Texture(image);
    const roughness = new Texture(image);
    const root = new Mesh(new BoxGeometry(), new MeshStandardMaterial({ map: color, roughnessMap: roughness }));
    const owner = ownObjectResources(root);
    assert.equal(owner.counts.textures, 2);
    owner.dispose();
    assert.equal(imageCloses, 1);
  });
});
