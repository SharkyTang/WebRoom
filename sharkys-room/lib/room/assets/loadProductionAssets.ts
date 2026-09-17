import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { LoadingManager, type Group, type Object3D } from 'three';
import { assetFamilies, assetManifest, initialAssetLoadReport, type AssetLoadReport } from './assetManifest';
import { installAssetFamily, validateAssembly } from './assetAssembly';
import { ownObjectResources } from './resourceOwnership';

/** Initial-load transaction: every family settles before the interaction runtime can attach. */
export async function loadProductionAssets(room: Object3D, signal: AbortSignal) {
  const report: AssetLoadReport = initialAssetLoadReport();
  const installations: ReturnType<typeof installAssetFamily>[] = [];
  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    installations.reverse().forEach(family => family.dispose());
  };
  // Abort can arrive while image decoding continues, so each continuation checks it too.
  signal.addEventListener('abort', dispose, { once: true });
  await Promise.all(assetFamilies.map(async id => {
    let asset: Group | undefined;
    try {
      const response = await fetch(assetManifest[id].url, { signal });
      if (!response.ok) throw new Error(`${assetManifest[id].label} model HTTP ${response.status}`);
      const data = await response.arrayBuffer();
      if (signal.aborted) return;
      const manager = new LoadingManager();
      const failedResources: string[] = [];
      manager.onError = url => { failedResources.push(url); };
      asset = (await new GLTFLoader(manager).parseAsync(data, '/models/production/')).scene;
      if (signal.aborted || disposed) { ownObjectResources(asset).dispose(); asset = undefined; return; }
      if (failedResources.length) throw new Error(`${assetManifest[id].label} texture could not load`);
      const installation = installAssetFamily(room, id, asset);
      installations.push(installation); asset = undefined;
      report[id] = { status: 'installed', error: null };
    } catch (error) {
      if (asset) ownObjectResources(asset).dispose();
      if (!signal.aborted) report[id] = { status: 'fallback', error: error instanceof Error ? error.message : String(error) };
    }
  }));
  signal.removeEventListener('abort', dispose);
  if (signal.aborted) dispose();
  const assembly = validateAssembly(room);
  return { report, assembly, dispose };
}
