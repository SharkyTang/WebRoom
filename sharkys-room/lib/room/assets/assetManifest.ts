/** Production roots are anchor-local, metre-scale glTF Y-up. No adaptation matrix. */
export type AssetPart = { root: string; anchor: string; proxyMeshNames?: readonly string[] };
export type AssetDefinition = {
  label: string; url: string; prefix: string; parts: readonly AssetPart[];
  stateSurface: string | null; surfaceRole: 'screen' | 'indicator' | 'none';
  requiredNodes: readonly string[]; requiredDescendants: readonly { node: string; root: string }[];
};
function furniture(id: string, label: string, prefix: string, parts: readonly AssetPart[]): AssetDefinition {
  return { label, url: `/models/production/${id}_v06a.glb`, prefix, parts, stateSurface: null, surfaceRole: 'none', requiredNodes: parts.map(part => part.root), requiredDescendants: [] };
}
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
  floor: furniture('floor', '地板', 'VIS_Floor', [{ root: 'VIS_Floor', anchor: 'ENV_Floor' }]),
  walls: furniture('walls', '墙面', 'VIS_Wall', [{ root: 'VIS_WallLeft', anchor: 'ENV_Wall_Left' }, { root: 'VIS_WallRight', anchor: 'ENV_Wall_Right' }]),
  door: furniture('door', '门', 'VIS_Door', [{ root: 'VIS_DoorBody', anchor: 'ENV_Door' }, { root: 'VIS_DoorHandle', anchor: 'DEC_DoorHandle' }]),
  window: furniture('window', '窗框', 'VIS_Window', [{ root: 'VIS_WindowFrame', anchor: 'ENV_WindowFrame' }]),
  curtains: furniture('curtains', '窗帘', 'VIS_Curtain', [{ root: 'VIS_CurtainLeft', anchor: 'ENV_Curtain_Left' }, { root: 'VIS_CurtainRight', anchor: 'ENV_Curtain_Right' }]),
  desk: furniture('desk', '书桌', 'VIS_Desk', [{ root: 'VIS_Desk', anchor: 'FUR_Desk' }]),
  cabinet: furniture('cabinet', '展示柜', 'VIS_Cabinet', [{ root: 'VIS_Cabinet', anchor: 'FUR_DisplayCabinet' }]),
  bed: furniture('bed', '床', 'VIS_Bed', [{ root: 'VIS_Bed', anchor: 'FUR_Bed' }]),
  bedside: furniture('bedside', '床头柜', 'VIS_Bedside', [{ root: 'VIS_Bedside', anchor: 'FUR_BedsideTable' }]),
  sofa: furniture('sofa', '沙发', 'VIS_Sofa', [{ root: 'VIS_Sofa', anchor: 'FUR_Sofa' }]),
  chair: furniture('chair', '办公椅', 'VIS_Chair', [{ root: 'VIS_Chair', anchor: 'FUR_OfficeChair' }]),
  coffee: furniture('coffee', '茶几', 'VIS_Coffee', [{ root: 'VIS_Coffee', anchor: 'FUR_CoffeeTable' }]),
  sidetable: furniture('sidetable', '小圆边桌', 'VIS_SideTable', [{ root: 'VIS_SideTable', anchor: 'FUR_SideTable' }]),
  beanbag: furniture('beanbag', 'Beanbag', 'VIS_Beanbag', [{ root: 'VIS_Beanbag', anchor: 'FUR_BeanBag' }]),
  rugs: furniture('rugs', '地毯', 'VIS_Rug', [{ root: 'VIS_RugWorkstation', anchor: 'DEC_Rug_Workstation' }, { root: 'VIS_RugLounge', anchor: 'DEC_Rug_Lounge' }]),
  dogbed: furniture('dogbed', '狗窝', 'VIS_DogBed', [{ root: 'VIS_DogBed', anchor: 'DEC_DogBedProxy', proxyMeshNames: ['DEC_DogBedProxy_Mesh'] }]),
} as const satisfies Record<string, AssetDefinition>;
export type AssetFamily = keyof typeof assetManifest;
export const assetFamilies = Object.keys(assetManifest) as AssetFamily[];
export const furnitureFamilies = assetFamilies.filter(id => !(['monitor', 'macbook', 'marshall'] as string[]).includes(id));
export type AssetLoadState = { status: 'loading' | 'installed' | 'fallback'; error: string | null };
export type AssetLoadReport = Record<AssetFamily, AssetLoadState>;
export const initialAssetLoadReport = (): AssetLoadReport => Object.fromEntries(assetFamilies.map(id => [id, { status: 'loading', error: null }])) as AssetLoadReport;
