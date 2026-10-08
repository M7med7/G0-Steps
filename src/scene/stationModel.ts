/*
 * Loads the station model built in Blender (tools/blender/build_station.py) and turns it into the same layer objects
 * that buildDevice() makes, so DeviceScene works with either one.
 * The .glb is in metres, with one root node per layer named by its DeviceLayerId and part nodes named by DevicePartId.
 */
import * as THREE from 'three';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DEVICE_LAYERS, LAYER_PARTS, type DeviceLayerId, type DevicePartId } from '../models/deviceLayers';
import type { LayerObject } from './deviceModel';

/** The model is in metres; the scene uses 1 unit = 10 cm. */
const METRES_TO_UNITS = 10;
/** Transparent textured surfaces (the foot outlines) draw after the glass under them. */
const DECAL_RENDER_ORDER = 2;

export const STATION_MODEL_URL = `${import.meta.env.BASE_URL}models/station.glb`;

export async function loadStationModel(url: string = STATION_MODEL_URL): Promise<Map<DeviceLayerId, LayerObject>> {
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const gltf = await loader.loadAsync(url);
  return layersFromModel(gltf.scene);
}

/** Throws if a layer or part is missing, so the caller can fall back to the procedural model. */
export function layersFromModel(root: THREE.Object3D): Map<DeviceLayerId, LayerObject> {
  const layers = new Map<DeviceLayerId, LayerObject>();
  for (const id of DEVICE_LAYERS) {
    const node = root.children.find((child) => child.name === id);
    if (!node) throw new Error(`Station model has no layer named ${id}`);

    // The layer node's own position is its assembled height. DeviceScene places the group instead.
    const group = new THREE.Group();
    group.name = id;
    for (const child of [...node.children]) {
      child.position.multiplyScalar(METRES_TO_UNITS);
      child.scale.multiplyScalar(METRES_TO_UNITS);
      group.add(child);
    }

    const parts = new Map<DevicePartId, THREE.Object3D>();
    for (const part of LAYER_PARTS[id]) {
      const object = group.children.find((child) => child.name === part);
      if (!object) throw new Error(`Layer ${id} has no part named ${part}`);
      parts.set(part, object);
    }

    const materials = ownMaterials(group);
    if (materials.length === 0) throw new Error(`Layer ${id} has no meshes`);

    group.traverse((child) => {
      child.userData.layer = id;
    });
    for (const [part, object] of parts) object.traverse((child) => (child.userData.part = part));

    group.updateMatrixWorld(true);
    const localBox = new THREE.Box3().setFromObject(group);
    const partBoxes = new Map<DevicePartId, THREE.Box3>();
    for (const [part, object] of parts) partBoxes.set(part, new THREE.Box3().setFromObject(object));

    layers.set(id, { id, group, parts, materials, localBox, partBoxes });
  }
  return layers;
}

/** Gives every mesh its own copy of its material, so fading or tinting one layer never touches another. */
function ownMaterials(group: THREE.Group): THREE.MeshStandardMaterial[] {
  const materials: THREE.MeshStandardMaterial[] = [];
  group.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    const source: unknown = child.material;
    if (!(source instanceof THREE.MeshStandardMaterial)) throw new Error(`Mesh ${child.name} needs a single standard material`);
    const material = source.clone();
    child.material = material;
    materials.push(material);
    if (material.transparent && material.map) child.renderOrder = DECAL_RENDER_ORDER;
  });
  return materials;
}
