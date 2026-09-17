/** Seconds. A single tween system drives camera and mechanical transitions. */
export const animationDurations = {
  cameraFocus: 1.1,
  cameraReturn: 1.1,
  cameraReduced: 0.08,
  hinge: 0.55,
  piano: 0.65,
  switch: 0.2,
  power: 0.2,
  reduced: 0,
} as const;

export const animationEase = 'power2.inOut';
export const cameraEase = 'sine.inOut';

/** Authoring metadata converted once from Blender Z-up into loaded glTF Y-up. */
export const mechanicalEndpoints = {
  macbook: { axis: 'x', closed: 0, open: -105 * Math.PI / 180 },
  trash: { axis: 'x', closed: 0, open: -100 * Math.PI / 180 },
  switch: { axis: 'z', on: 8 * Math.PI / 180, off: -8 * Math.PI / 180 },
  piano: { axis: 'z', travel: 0.65, authoringRetracted: -1.94, authoringExtended: -1.29 },
} as const;

export const practicalLightNames = ['LGT_CabinetProxy', 'LGT_DeskProxy', 'LGT_BedProxy'] as const;
