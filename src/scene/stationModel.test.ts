import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { DEVICE_LAYERS, type DeviceLayerId } from '../models/deviceLayers';
import { layersFromModel } from './stationModel';

/** A small stand-in for the exported .glb: one node per layer in metres, with the two camera parts. */
function fakeModel(options: { skipLayer?: DeviceLayerId; skipPart?: string } = {}): THREE.Group {
  const root = new THREE.Group();
  const shared = new THREE.MeshStandardMaterial();
  const box = new THREE.BoxGeometry(0.4, 0.01, 0.3);
  DEVICE_LAYERS.forEach((id, index) => {
    if (id === options.skipLayer) return;
    const node = new THREE.Object3D();
    node.name = id;
    node.position.set(0, index * 0.02, 0);
    node.add(new THREE.Mesh(box, shared));
    if (id === 'cameras') {
      for (const [part, x] of [['esp32Camera', -0.085], ['mlxCamera', 0.085]] as const) {
        if (part === options.skipPart) continue;
        const object = new THREE.Object3D();
        object.name = part;
        object.position.set(x, 0.009, 0);
        object.add(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.004, 0.06), shared));
        node.add(object);
      }
    }
    root.add(node);
  });
  return root;
}

describe('layersFromModel', () => {
  it('returns every layer, with the layer group at the origin', () => {
    const layers = layersFromModel(fakeModel());
    expect([...layers.keys()]).toEqual(DEVICE_LAYERS);
    for (const layer of layers.values()) expect(layer.group.position.toArray()).toEqual([0, 0, 0]);
  });

  it('converts metres to scene units (1 = 10 cm)', () => {
    const layers = layersFromModel(fakeModel());
    const esp = layers.get('cameras')?.parts.get('esp32Camera');
    expect(esp?.position.x).toBeCloseTo(-0.85);
    expect(esp?.position.y).toBeCloseTo(0.09);
    const box = layers.get('outerShell')?.localBox;
    expect(box && box.max.x - box.min.x).toBeCloseTo(4);
  });

  it('finds the camera parts and tags their meshes for picking', () => {
    const cameras = layersFromModel(fakeModel()).get('cameras');
    expect([...(cameras?.parts.keys() ?? [])]).toEqual(['esp32Camera', 'mlxCamera']);
    expect(cameras?.partBoxes.get('mlxCamera')?.isEmpty()).toBe(false);
    const mesh = cameras?.parts.get('mlxCamera')?.children[0];
    expect(mesh?.userData).toEqual({ layer: 'cameras', part: 'mlxCamera' });
  });

  it('gives every layer its own materials, even when the file shares one', () => {
    const layers = [...layersFromModel(fakeModel()).values()];
    const all = layers.flatMap((layer) => layer.materials);
    expect(new Set(all).size).toBe(all.length);
  });

  it('keeps the baked occlusion map on each material copy', () => {
    const root = fakeModel();
    const ao = new THREE.Texture();
    const mesh = root.getObjectByName('circuit')?.children[0];
    if (!(mesh instanceof THREE.Mesh)) throw new Error('fake model has no circuit mesh');
    mesh.material = new THREE.MeshStandardMaterial({ aoMap: ao });
    const material = layersFromModel(root).get('circuit')?.materials[0];
    expect(material?.aoMap).toBe(ao);
  });

  it('draws transparent textured surfaces after the glass', () => {
    const root = fakeModel();
    const glass = root.getObjectByName('topGlass');
    const decal = new THREE.Mesh(new THREE.PlaneGeometry(4, 3), new THREE.MeshStandardMaterial({ transparent: true, map: new THREE.Texture() }));
    glass?.add(decal);
    const topGlass = layersFromModel(root).get('topGlass');
    const meshes = topGlass?.group.children.filter((child) => child instanceof THREE.Mesh) ?? [];
    expect(meshes.map((m) => m.renderOrder)).toEqual([0, 2]);
  });

  it('throws when a layer or part is missing, so the page can fall back', () => {
    expect(() => layersFromModel(fakeModel({ skipLayer: 'circuit' }))).toThrow(/circuit/);
    expect(() => layersFromModel(fakeModel({ skipPart: 'mlxCamera' }))).toThrow(/mlxCamera/);
  });
});
