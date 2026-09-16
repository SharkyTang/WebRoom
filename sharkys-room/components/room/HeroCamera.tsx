import { useLayoutEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import type { PerspectiveCamera } from 'three';
import { HERO_ASPECT } from '@/lib/room/sceneConstants';
export function HeroCamera({source,onReady}:{source:PerspectiveCamera;onReady:()=>void}) {
  const set=useThree(state=>state.set); const get=useThree(state=>state.get);
  const hero=useMemo(()=>{
    source.updateWorldMatrix(true,false);
    const clone=source.clone();
    source.matrixWorld.decompose(clone.position,clone.quaternion,clone.scale);
    clone.aspect=HERO_ASPECT; clone.updateProjectionMatrix(); clone.updateMatrixWorld();
    return clone;
  },[source]);
  useLayoutEffect(()=>{const previous=get().camera;set({camera:hero});onReady();return()=>{set({camera:previous});};},[get,set,hero,onReady]);
  return null;
}
