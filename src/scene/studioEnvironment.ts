/*
 * The studio lighting image used for reflections on the device page: the same one the Blender previews are lit with.
 * It's "studio_small_01" by Greg Zaal (Poly Haven), CC0, as bundled with Blender (1K, about 100 kB).
 */
import * as THREE from 'three';
import { EXRLoader } from 'three/addons/loaders/EXRLoader.js';

export const STUDIO_ENVIRONMENT_URL = `${import.meta.env.BASE_URL}env/studio.exr`;

export async function loadStudioEnvironment(url: string = STUDIO_ENVIRONMENT_URL): Promise<THREE.DataTexture> {
  const texture = await new EXRLoader().loadAsync(url);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  return texture;
}
