/** Static C authoring reservations. This module creates no light, material or runtime binding. */
export type FixtureGroup = 'bed' | 'desk' | 'cabinet';
export type FixtureMappingStatus = 'spatial-correspondence' | 'candidate' | 'unassigned';
type XYZ = readonly [number, number, number];
type FixtureReservation = {
  id: 'bedside' | 'lounge' | 'deskStrip' | 'cabinetStrip';
  root: string;
  anchor: string;
  surface: string;
  surfaceMaterial: string;
  proxyMeshNames: readonly string[];
  futureGroup: FixtureGroup | null;
  existingSourceLight: 'LGT_BedProxy' | 'LGT_DeskProxy' | 'LGT_CabinetProxy' | null;
  mappingStatus: FixtureMappingStatus;
  mappingBasis: string;
  pendingDecision: string | null;
  localEnvelope: { min: XYZ; max: XYZ };
  emissive: readonly [0, 0, 0];
  stateSurface: null;
  surfaceRole: 'none';
  runtimeBinding: null;
};

/** Read-only source measurements, not values to apply to the existing lights. */
export const fixtureSourceLights = {
  bed: { node: 'LGT_BedProxy', parent: 'LIGHTING', worldPosition: [2.97, .84, -2.5] },
  desk: { node: 'LGT_DeskProxy', parent: 'LIGHTING', worldPosition: [-1.85, 1.24, -1.95] },
  cabinet: { node: 'LGT_CabinetProxy', parent: 'LIGHTING', worldPosition: [-2.7, 2.25, -.7] },
} as const;

export const fixtureRegistry = [
  {
    id: 'bedside', root: 'VIS_FixtureBedside', anchor: 'DEC_Lamp_Bedside',
    surface: 'VIS_FixtureBedsideSurface', surfaceMaterial: 'MAT_V06C_FixtureBedsideSurface',
    proxyMeshNames: ['DEC_Lamp_Bedside_Mesh', 'DEC_Lamp_Bedside_Mesh_1'],
    futureGroup: 'bed', existingSourceLight: 'LGT_BedProxy', mappingStatus: 'spatial-correspondence',
    mappingBasis: '原床灯与 Bed 点灯 X/Z 同位；点灯位于灯壳局部 Y=.26 的灯罩内。',
    pendingDecision: '后续独立灯组的表面状态绑定与配光，C 中未实现。',
    localEnvelope: { min: [-.098, 0, -.098], max: [.098, .3785, .098] },
    emissive: [0, 0, 0], stateSurface: null, surfaceRole: 'none', runtimeBinding: null,
  },
  {
    id: 'lounge', root: 'VIS_FixtureLounge', anchor: 'DEC_Lamp_Lounge',
    surface: 'VIS_FixtureLoungeSurface', surfaceMaterial: 'MAT_V06C_FixtureLoungeSurface',
    proxyMeshNames: ['DEC_Lamp_Lounge_Mesh', 'DEC_Lamp_Lounge_Mesh_1'],
    futureGroup: null, existingSourceLight: null, mappingStatus: 'unassigned',
    mappingBasis: '沿用原休闲灯及 A 边桌承托；原三盏点灯中没有专属 Lounge 灯点。',
    pendingDecision: '未来灯组归属待定；不冒充 Desk，不新增第四组。',
    localEnvelope: { min: [-.098, 0, -.098], max: [.098, .3785, .098] },
    emissive: [0, 0, 0], stateSurface: null, surfaceRole: 'none', runtimeBinding: null,
  },
  {
    id: 'deskStrip', root: 'VIS_FixtureDeskStrip', anchor: 'FUR_Desk',
    surface: 'VIS_FixtureDeskStripSurface', surfaceMaterial: 'MAT_V06C_FixtureDeskStripSurface',
    proxyMeshNames: [], futureGroup: 'desk', existingSourceLight: 'LGT_DeskProxy', mappingStatus: 'candidate',
    mappingBasis: '仅在 A 桌板后沿下表面预留；位于原后撑后侧，避开 B 钢琴运动区域。',
    pendingDecision: '条体与原 Desk 点灯不物理同位；后续配光和状态绑定待定，不移动原点灯。',
    localEnvelope: { min: [-.8, .665, -.405], max: [.8, .6695, -.395] },
    emissive: [0, 0, 0], stateSurface: null, surfaceRole: 'none', runtimeBinding: null,
  },
  {
    id: 'cabinetStrip', root: 'VIS_FixtureCabinetStrip', anchor: 'FUR_DisplayCabinet',
    surface: 'VIS_FixtureCabinetStripSurface', surfaceMaterial: 'MAT_V06C_FixtureCabinetStripSurface',
    proxyMeshNames: [], futureGroup: 'cabinet', existingSourceLight: 'LGT_CabinetProxy', mappingStatus: 'candidate',
    mappingBasis: '在 A 顶板下方分四段预留，保留原分隔板与所有收藏格。',
    pendingDecision: '条体与柜前原点灯不物理同位；后续配光和状态绑定待定，不移动原点灯。',
    localEnvelope: { min: [.248, 2.5205, -1.54], max: [.272, 2.5245, 1.99] },
    emissive: [0, 0, 0], stateSurface: null, surfaceRole: 'none', runtimeBinding: null,
  },
] as const satisfies readonly FixtureReservation[];

/** Gaps are intentional: a continuous strip would pass through original dividers. */
export const cabinetFixtureSegments = [
  { compartment: 'hogwarts', localZ: [.39, 1.99] },
  { compartment: 'eiffel', localZ: [-.4675, .27] },
  { compartment: 'sls', localZ: [-.9475, -.5725] },
  { compartment: 'small-reserved', localZ: [-1.54, -1.0525] },
] as const;
