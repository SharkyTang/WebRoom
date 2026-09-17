/** Production roots are anchor-local, metre-scale glTF Y-up. No adaptation matrix. */
export const assetManifest = {
  monitor: {
    label: 'Monitor', url: '/models/production/monitor_pilot.glb', prefix: 'VIS_Monitor',
    parts: [
      { root: 'VIS_MonitorBody', anchor: 'TEC_MonitorBody' },
      { root: 'VIS_MonitorDisplaySurface', anchor: 'TEC_MonitorScreen' },
    ],
    stateSurface: 'VIS_MonitorDisplaySurface', surfaceRole: 'screen',
    requiredNodes: ['VIS_MonitorBody', 'VIS_MonitorDisplaySurface'],
    requiredDescendants: [],
  },
  macbook: {
    label: 'MacBook', url: '/models/production/macbook_pilot.glb', prefix: 'VIS_MacBook',
    parts: [
      { root: 'VIS_MacBookBase', anchor: 'TEC_MacBookBase' },
      { root: 'VIS_MacBookLid', anchor: 'TEC_MacBookScreen' },
    ],
    stateSurface: 'VIS_MacBookDisplaySurface', surfaceRole: 'screen',
    requiredNodes: ['VIS_MacBookBase', 'VIS_MacBookLid', 'VIS_MacBookLidHousing', 'VIS_MacBookDisplaySurface'],
    // Both visible lid surfaces must inherit the original screen anchor's hinge.
    requiredDescendants: [
      { node: 'VIS_MacBookLidHousing', root: 'VIS_MacBookLid' },
      { node: 'VIS_MacBookDisplaySurface', root: 'VIS_MacBookLid' },
    ],
  },
  marshall: {
    label: 'Marshall', url: '/models/production/marshall_pilot.glb', prefix: 'VIS_Marshall',
    parts: [{ root: 'VIS_MarshallBody', anchor: 'TEC_Marshall' }],
    stateSurface: 'VIS_MarshallPowerIndicator', surfaceRole: 'indicator',
    requiredNodes: ['VIS_MarshallBody', 'VIS_MarshallGrille', 'VIS_MarshallPowerIndicator'],
    requiredDescendants: [
      { node: 'VIS_MarshallGrille', root: 'VIS_MarshallBody' },
      { node: 'VIS_MarshallPowerIndicator', root: 'VIS_MarshallBody' },
    ],
  },
} as const;
export type AssetFamily = keyof typeof assetManifest;
export const assetFamilies = Object.keys(assetManifest) as AssetFamily[];
export type AssetLoadState = { status: 'loading' | 'installed' | 'fallback'; error: string | null };
export type AssetLoadReport = Record<AssetFamily, AssetLoadState>;
export const initialAssetLoadReport = (): AssetLoadReport => ({
  monitor: { status: 'loading', error: null },
  macbook: { status: 'loading', error: null },
  marshall: { status: 'loading', error: null },
});
