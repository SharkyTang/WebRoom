/** Production roots are anchor-local, metre-scale glTF Y-up. No adaptation matrix. */
import { fixtureRegistry } from './fixtureRegistry';

export type AssetPart = { root: string; anchor: string; proxyMeshNames?: readonly string[] };
export type AssetDefinition = {
  label: string; url: string; prefix: string; parts: readonly AssetPart[];
  stateSurface: string | null; surfaceRole: 'screen' | 'indicator' | 'none';
  retiredPlaceholderMeshes?: readonly string[];
  requiredNodes: readonly string[]; requiredDescendants: readonly { node: string; root: string }[];
};
function decor(id: string, label: string, prefix: string, parts: readonly AssetPart[]): AssetDefinition {
  return { label, url: `/models/production/${id}_v06c.glb`, prefix, parts, stateSurface: null, surfaceRole: 'none', requiredNodes: parts.map(part => part.root), requiredDescendants: [] };
}
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
  piano: {
    label: 'Piano', url: '/models/production/piano_v06b.glb', prefix: 'VIS_Piano',
    parts: [{ root: 'VIS_PianoBody', anchor: 'INT_Piano' }, { root: 'VIS_PianoSlide', anchor: 'INT_PianoRail', proxyMeshNames: [] }],
    stateSurface: null, surfaceRole: 'none', requiredNodes: ['VIS_PianoBody', 'VIS_PianoSlide'], requiredDescendants: [],
  },
  ipad: {
    label: 'iPad', url: '/models/production/ipad_v06b.glb', prefix: 'VIS_iPad',
    parts: [{ root: 'VIS_iPadBody', anchor: 'TEC_iPad' }],
    stateSurface: 'VIS_iPadDisplaySurface', surfaceRole: 'screen', requiredNodes: ['VIS_iPadBody', 'VIS_iPadDisplaySurface'],
    requiredDescendants: [{ node: 'VIS_iPadDisplaySurface', root: 'VIS_iPadBody' }],
  },
  phone: {
    label: 'Phone', url: '/models/production/phone_v06b.glb', prefix: 'VIS_Phone',
    parts: [{ root: 'VIS_PhoneBody', anchor: 'TEC_Phone' }],
    stateSurface: 'VIS_PhoneDisplaySurface', surfaceRole: 'screen', requiredNodes: ['VIS_PhoneBody', 'VIS_PhoneDisplaySurface', 'VIS_PhoneStand'],
    requiredDescendants: [{ node: 'VIS_PhoneDisplaySurface', root: 'VIS_PhoneBody' }, { node: 'VIS_PhoneStand', root: 'VIS_PhoneBody' }],
  },
  trashcan: {
    label: 'Trash can', url: '/models/production/trashcan_v06b.glb', prefix: 'VIS_TrashCan',
    parts: [{ root: 'VIS_TrashCanBody', anchor: 'INT_TrashCanBody' }, { root: 'VIS_TrashCanLid', anchor: 'INT_TrashCanLid' }],
    stateSurface: null, surfaceRole: 'none', requiredNodes: ['VIS_TrashCanBody', 'VIS_TrashCanLid'], requiredDescendants: [],
  },
  lightswitch: {
    label: 'Light switch', url: '/models/production/lightswitch_v06b.glb', prefix: 'VIS_LightSwitch',
    parts: [{ root: 'VIS_LightSwitchPlate', anchor: 'DEC_LightSwitchPlate' }, { root: 'VIS_LightSwitchRocker', anchor: 'INT_LightSwitch' }],
    stateSurface: null, surfaceRole: 'none', requiredNodes: ['VIS_LightSwitchPlate', 'VIS_LightSwitchRocker'], requiredDescendants: [],
  },
  keyboard: {
    label: 'Keyboard', url: '/models/production/keyboard_v06b.glb', prefix: 'VIS_Keyboard',
    parts: [{ root: 'VIS_Keyboard', anchor: 'TEC_Keyboard' }],
    stateSurface: null, surfaceRole: 'none', requiredNodes: ['VIS_Keyboard'], requiredDescendants: [],
  },
  mouse: {
    label: 'Mouse', url: '/models/production/mouse_v06b.glb', prefix: 'VIS_Mouse',
    parts: [{ root: 'VIS_Mouse', anchor: 'TEC_Mouse' }],
    stateSurface: null, surfaceRole: 'none', requiredNodes: ['VIS_Mouse'], requiredDescendants: [],
  },
  headphones: {
    label: 'Headphones', url: '/models/production/headphones_v06b.glb', prefix: 'VIS_Headphones',
    parts: [{ root: 'VIS_Headphones', anchor: 'TEC_Headphones' }],
    stateSurface: null, surfaceRole: 'none', requiredNodes: ['VIS_Headphones'], requiredDescendants: [],
  },
  eiffel: decor('eiffel', 'Eiffel Tower', 'VIS_Eiffel', [{ root: 'VIS_Eiffel', anchor: 'DSP_EiffelTower_Bounds' }]),
  hogwarts: decor('hogwarts', 'Hogwarts', 'VIS_Hogwarts', [{ root: 'VIS_Hogwarts', anchor: 'DSP_Castle_Bounds' }]),
  minastirith: {
    ...decor('minastirith', 'Minas Tirith', 'VIS_MinasTirith', [{ root: 'VIS_MinasTirith', anchor: 'DSP_Architecture_Bounds' }]),
    // These two generic slots have no confirmed collectible; retain identities and roll back with this family.
    retiredPlaceholderMeshes: ['DSP_MediumModel_Bounds', 'DSP_SmallModel_Bounds'],
  },
  falcon: decor('falcon', 'Millennium Falcon', 'VIS_Falcon', [{ root: 'VIS_Falcon', anchor: 'DSP_Falcon_Bounds' }]),
  bridge: decor('bridge', 'Tower Bridge', 'VIS_TowerBridge', [{ root: 'VIS_TowerBridge', anchor: 'DSP_Bridge_Bounds' }]),
  sls: decor('sls', 'SLS', 'VIS_SLS', [{ root: 'VIS_SLS', anchor: 'DSP_TallRocket_Bounds' }]),
  ferrari: decor('ferrari', 'Ferrari F1', 'VIS_Ferrari', [{ root: 'VIS_Ferrari', anchor: 'DSP_Vehicle_Bounds' }]),
  mercedes: decor('mercedes', 'Mercedes-AMG F1', 'VIS_Mercedes', [{ root: 'VIS_Mercedes', anchor: 'DSP_MercedesAMGF1_Bounds' }]),
  plants: decor('plants', '植物', 'VIS_Plant', [
    { root: 'VIS_PlantCabinet', anchor: 'DEC_Plant_Cabinet' },
    { root: 'VIS_PlantCoffeeTable', anchor: 'DEC_Plant_CoffeeTable' },
    { root: 'VIS_PlantDesk', anchor: 'DEC_Plant_Desk' },
    { root: 'VIS_PlantSofa', anchor: 'DEC_Plant_Sofa' },
    { root: 'VIS_PlantWindow', anchor: 'DEC_Plant_Window' },
  ]),
  cola: decor('cola', '冰杯可乐', 'VIS_Cola', [{ root: 'VIS_Cola', anchor: 'FUR_CoffeeTable', proxyMeshNames: [] }]),
  dog: decor('dog', '睡姿小狗', 'VIS_SleepingDog', [{ root: 'VIS_SleepingDog', anchor: 'DEC_DogBedProxy', proxyMeshNames: ['DEC_DogBedProxy_Mesh_1'] }]),
  fixtures: {
    ...decor('fixtures', '灯具外壳', 'VIS_Fixture', fixtureRegistry.map(({ root, anchor, proxyMeshNames }) => ({ root, anchor, proxyMeshNames }))),
    requiredNodes: fixtureRegistry.flatMap(({ root, surface }) => [root, surface]),
    requiredDescendants: fixtureRegistry.map(({ root, surface }) => ({ node: surface, root })),
  },
  wallart: decor('wallart', '墙画', 'VIS_WallArt', [{ root: 'VIS_WallArt', anchor: 'DEC_WallArt' }]),
} as const satisfies Record<string, AssetDefinition>;
export type AssetFamily = keyof typeof assetManifest;
export const assetFamilies = Object.keys(assetManifest) as AssetFamily[];
// A's membership stays fixed as later authorized batches extend the manifest.
export const furnitureFamilies: AssetFamily[] = ['floor', 'walls', 'door', 'window', 'curtains', 'desk', 'cabinet', 'bed', 'bedside', 'sofa', 'chair', 'coffee', 'sidetable', 'beanbag', 'rugs', 'dogbed'];
// C is explicitly enumerated; only the sequentially installed subset is active.
export const decorFamilies: AssetFamily[] = (['eiffel', 'hogwarts', 'minastirith', 'falcon', 'bridge', 'sls', 'ferrari', 'mercedes', 'plants', 'cola', 'dog', 'fixtures', 'wallart'] as AssetFamily[]).filter(id => id in assetManifest);
export type AssetLoadState = { status: 'loading' | 'installed' | 'fallback'; error: string | null };
export type AssetLoadReport = Record<AssetFamily, AssetLoadState>;
export const initialAssetLoadReport = (): AssetLoadReport => Object.fromEntries(assetFamilies.map(id => [id, { status: 'loading', error: null }])) as AssetLoadReport;
