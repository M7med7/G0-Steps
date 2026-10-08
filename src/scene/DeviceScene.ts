/*
 * Owns the WebGL canvas for the device page: lights, camera, orbit controls, labels and every animation.
 * The controller tells it what to focus on; it never changes app state itself.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { CSS2DObject, CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { DEVICE_LAYERS, type DeviceFocus, type DeviceLayerId, type DevicePartId, type DeviceSelection } from '../models/deviceLayers';
import { buildDevice, buildGroundShadow, layerY, type LayerObject } from './deviceModel';

const CAMERA_SECONDS = 1.1;
const EXPLODE_SECONDS = 1.3;
const FADE_SECONDS = 0.45;
/** How visible the layers below stay while one is in focus. Layers above it are hidden so nothing blocks the view. */
const FADED_ALPHA = 0.1;
/** Viewing direction for a focused layer: in front, a little to the right and from above, like the concept render. */
const FOCUS_DIRECTION = new THREE.Vector3(0.38, 0.95, 1).normalize();
const OVERVIEW_DIRECTION = new THREE.Vector3(0.5, 0.42, 1).normalize();
const HOVER_EMISSIVE = new THREE.Color(0xb08326);

export interface LabelText {
  readonly layers: Readonly<Record<DeviceLayerId, string>>;
  readonly parts: Readonly<Record<DevicePartId, string>>;
}

interface MaterialBase {
  readonly opacity: number;
  readonly transparent: boolean;
  readonly depthWrite: boolean;
  readonly emissive: THREE.Color;
}

interface CameraTween {
  readonly fromPosition: THREE.Vector3;
  readonly fromTarget: THREE.Vector3;
  readonly toPosition: THREE.Vector3;
  readonly toTarget: THREE.Vector3;
  elapsed: number;
}

const easeInOut = (t: number): number => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

export class DeviceScene {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly labelRenderer = new CSS2DRenderer();
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(32, 1, 0.1, 200);
  private readonly controls: OrbitControls;
  private readonly layers: Map<DeviceLayerId, LayerObject>;
  private readonly base = new Map<THREE.MeshStandardMaterial, MaterialBase>();
  private readonly alpha = new Map<DeviceLayerId, { current: number; target: number }>();
  private readonly layerLabels = new Map<DeviceLayerId, CSS2DObject>();
  private readonly partLabels = new Map<DevicePartId, CSS2DObject>();
  private readonly raycaster = new THREE.Raycaster();
  private readonly timer = new THREE.Timer();

  private explode = 0;
  private explodeTarget = 0;
  private cameraTween: CameraTween | null = null;
  private focus: DeviceFocus = null;
  private hovered: DeviceLayerId | null = null;
  private resizeObserver: ResizeObserver;

  constructor(
    private readonly host: HTMLElement,
    private readonly reduceMotion: boolean,
  ) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.domElement.classList.add('d-canvas');
    host.append(this.renderer.domElement);

    this.labelRenderer.domElement.classList.add('d-labels');
    host.append(this.labelRenderer.domElement);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    const key = new THREE.DirectionalLight(0xffffff, 1.4);
    key.position.set(4, 10, 6);
    this.scene.add(key, new THREE.HemisphereLight(0xffffff, 0x5d8f95, 0.6));

    this.layers = buildDevice();
    for (const layer of this.layers.values()) {
      this.scene.add(layer.group);
      this.alpha.set(layer.id, { current: 1, target: 1 });
      for (const material of layer.materials) {
        this.base.set(material, {
          opacity: material.opacity,
          transparent: material.transparent,
          depthWrite: material.depthWrite,
          emissive: material.emissive.clone(),
        });
      }
    }
    this.scene.add(buildGroundShadow());
    this.createLabels();

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 1.2;
    this.controls.maxDistance = 30;
    this.controls.maxPolarAngle = Math.PI * 0.62;
    this.controls.enablePan = false;
    this.controls.addEventListener('start', () => (this.cameraTween = null));

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(host);
    this.resize();
    this.placeLayers();
    this.jumpCamera(this.overviewPose(1));
    this.renderer.setAnimationLoop((time) => this.frame(time));
  }

  /** 0 is assembled, 1 is fully exploded. */
  setExploded(exploded: boolean, animate = true): void {
    this.explodeTarget = exploded ? 1 : 0;
    if (!animate || this.reduceMotion) this.explode = this.explodeTarget;
    if (!this.focus) this.moveCamera(this.overviewPose(this.explodeTarget), animate);
  }

  setFocus(focus: DeviceFocus): void {
    this.focus = focus;
    this.setHover(null);
    if (focus) this.explodeTarget = 1;
    const focusIndex = focus ? DEVICE_LAYERS.indexOf(focus.layer) : -1;
    DEVICE_LAYERS.forEach((id, index) => {
      const state = this.alpha.get(id);
      if (state) state.target = !focus || index === focusIndex ? 1 : index < focusIndex ? 0 : FADED_ALPHA;
    });
    for (const [part, label] of this.partLabels) label.visible = focus?.layer === 'cameras' && focus.part !== part;
    this.moveCamera(focus ? this.focusPose(focus) : this.overviewPose(this.explodeTarget), true);
  }

  setLabels(text: LabelText): void {
    for (const [id, label] of this.layerLabels) setLabelText(label.element, text.layers[id]);
    for (const [id, label] of this.partLabels) setLabelText(label.element, text.parts[id]);
  }

  /** The layer and part under a point on the screen. Layers in focus win over faded ones in front of them. */
  pick(clientX: number, clientY: number): DeviceSelection | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const pointer = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(pointer, this.camera);
    const targetOf = (hit: THREE.Intersection): number => this.alpha.get(hit.object.userData.layer as DeviceLayerId)?.target ?? 0;
    const hits = this.raycaster.intersectObjects([...this.layers.values()].map((l) => l.group), true).filter((hit) => targetOf(hit) > 0);
    const hit = hits.find((h) => targetOf(h) > FADED_ALPHA) ?? hits[0];
    if (!hit) return null;
    const layer = hit.object.userData.layer as DeviceLayerId;
    const part = (hit.object.userData.part as DevicePartId | undefined) ?? null;
    return { layer, part };
  }

  /** Tints a layer under the mouse to show it can be picked. The layer already in focus is never tinted. */
  setHover(target: DeviceLayerId | null): void {
    const layer = target === this.focus?.layer ? null : target;
    this.renderer.domElement.style.cursor = target ? 'pointer' : '';
    if (layer === this.hovered) return;
    this.hovered = layer;
    for (const object of this.layers.values()) {
      for (const material of object.materials) {
        const base = this.base.get(material);
        if (!base) continue;
        if (object.id === layer) material.emissive.copy(base.emissive).lerp(HOVER_EMISSIVE, 0.15);
        else material.emissive.copy(base.emissive);
      }
    }
  }

  dispose(): void {
    this.renderer.setAnimationLoop(null);
    this.resizeObserver.disconnect();
    this.controls.dispose();
    this.renderer.dispose();
  }

  // ------------------------------------------------------------ internals

  private createLabels(): void {
    for (const layer of this.layers.values()) {
      const el = labelElement('select-layer', 'layer', layer.id);
      const label = new CSS2DObject(el);
      // Right edge of the label sits on the left side of the layer, so its leader line points at it.
      label.center.set(1, 0.5);
      const box = layer.localBox;
      label.position.set(box.min.x + 0.05, (box.min.y + box.max.y) / 2, box.max.z * 0.25);
      layer.group.add(label);
      this.layerLabels.set(layer.id, label);

      for (const [part, object] of layer.parts) {
        const partEl = labelElement('select-part', 'part', part);
        partEl.classList.add('d-label-part');
        const partLabel = new CSS2DObject(partEl);
        partLabel.center.set(0.5, 1.15);
        const partBox = layer.partBoxes.get(part);
        partLabel.position.set(object.position.x, partBox ? partBox.max.y + 0.05 : 0.4, object.position.z - 0.35);
        partLabel.visible = false;
        layer.group.add(partLabel);
        this.partLabels.set(part, partLabel);
      }
    }
  }

  private resize(): void {
    const width = Math.max(this.host.clientWidth, 1);
    const height = Math.max(this.host.clientHeight, 1);
    this.renderer.setSize(width, height, false);
    this.labelRenderer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    // Keep the framing right when the window or panel changes size.
    if (!this.cameraTween) this.jumpCamera(this.focus ? this.focusPose(this.focus) : this.overviewPose(this.explodeTarget));
  }

  private worldBox(layer: LayerObject, part: DevicePartId | null, explode: number): THREE.Box3 {
    const local = (part && layer.partBoxes.get(part)) || layer.localBox;
    return local.clone().translate(new THREE.Vector3(0, layerY(layer.id, explode), 0));
  }

  private overviewPose(explode: number): { position: THREE.Vector3; target: THREE.Vector3 } {
    const box = new THREE.Box3();
    for (const layer of this.layers.values()) box.union(this.worldBox(layer, null, explode));
    // Leave room on the left for the labels.
    box.min.x -= this.host.clientWidth < 700 ? 1.9 : 2.2;
    return this.fit(box, OVERVIEW_DIRECTION, 1.02);
  }

  private focusPose(focus: DeviceSelection): { position: THREE.Vector3; target: THREE.Vector3 } {
    const layer = this.layers.get(focus.layer);
    if (!layer) throw new Error(`Unknown layer ${focus.layer}`);
    const box = this.worldBox(layer, focus.part, 1);
    return this.fit(box, FOCUS_DIRECTION, focus.part ? 2.6 : 1.08);
  }

  /** Camera position that fits a box on screen, looking from a direction. */
  private fit(box: THREE.Box3, direction: THREE.Vector3, margin: number): { position: THREE.Vector3; target: THREE.Vector3 } {
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    const vFov = THREE.MathUtils.degToRad(this.camera.fov) / 2;
    const hFov = Math.atan(Math.tan(vFov) * this.camera.aspect);
    const distance = (sphere.radius * margin) / Math.sin(Math.min(vFov, hFov));
    return { target: sphere.center, position: sphere.center.clone().addScaledVector(direction, distance) };
  }

  private jumpCamera(pose: { position: THREE.Vector3; target: THREE.Vector3 }): void {
    this.camera.position.copy(pose.position);
    this.controls.target.copy(pose.target);
    this.controls.update();
  }

  private moveCamera(pose: { position: THREE.Vector3; target: THREE.Vector3 }, animate: boolean): void {
    if (!animate || this.reduceMotion) {
      this.cameraTween = null;
      this.jumpCamera(pose);
      return;
    }
    this.cameraTween = {
      fromPosition: this.camera.position.clone(),
      fromTarget: this.controls.target.clone(),
      toPosition: pose.position,
      toTarget: pose.target,
      elapsed: 0,
    };
  }

  private placeLayers(): void {
    for (const layer of this.layers.values()) layer.group.position.y = layerY(layer.id, this.explode);
  }

  private frame(time: number): void {
    this.timer.update(time);
    // Capped so one long frame doesn't make an animation jump straight to its end.
    const dt = Math.min(this.timer.getDelta(), 0.25);

    if (this.explode !== this.explodeTarget) {
      const step = this.reduceMotion ? 1 : dt / EXPLODE_SECONDS;
      this.explode = this.explode < this.explodeTarget ? Math.min(this.explode + step, this.explodeTarget) : Math.max(this.explode - step, this.explodeTarget);
      this.placeLayers();
    }
    // Layer labels only make sense once the layers have room between them.
    const showLayerLabels = !this.focus && this.explode > 0.85;
    for (const label of this.layerLabels.values()) label.visible = showLayerLabels;

    for (const [id, state] of this.alpha) {
      if (state.current === state.target) continue;
      const step = this.reduceMotion ? 1 : dt / FADE_SECONDS;
      state.current = state.current < state.target ? Math.min(state.current + step, state.target) : Math.max(state.current - step, state.target);
      this.applyAlpha(id, state.current);
    }

    const tween = this.cameraTween;
    if (tween) {
      tween.elapsed += dt;
      const t = easeInOut(Math.min(tween.elapsed / CAMERA_SECONDS, 1));
      this.camera.position.lerpVectors(tween.fromPosition, tween.toPosition, t);
      this.controls.target.lerpVectors(tween.fromTarget, tween.toTarget, t);
      if (t >= 1) this.cameraTween = null;
    }

    this.controls.update(dt);
    this.renderer.render(this.scene, this.camera);
    this.labelRenderer.render(this.scene, this.camera);
  }

  private applyAlpha(id: DeviceLayerId, alpha: number): void {
    const layer = this.layers.get(id);
    if (!layer) return;
    const faded = alpha < 0.999;
    layer.group.visible = alpha > 0.001;
    for (const material of layer.materials) {
      const base = this.base.get(material);
      if (!base) continue;
      material.opacity = base.opacity * alpha;
      const transparent = base.transparent || faded;
      if (material.transparent !== transparent) {
        material.transparent = transparent;
        material.needsUpdate = true;
      }
      material.depthWrite = base.depthWrite && !faded;
    }
    // Faded layers draw after solid ones so they never hide the layer in focus.
    layer.group.traverse((child) => {
      const baseOrder = (child.userData.baseOrder as number | undefined) ?? child.renderOrder;
      child.userData.baseOrder = baseOrder;
      child.renderOrder = baseOrder + (faded ? 10 : 0);
    });
  }
}

function labelElement(action: string, key: string, value: string): HTMLButtonElement {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'd-label';
  el.dataset.action = action;
  el.dataset[key] = value;
  el.innerHTML = '<span class="d-label-text"></span><i class="d-leader" aria-hidden="true"></i>';
  return el;
}

function setLabelText(el: HTMLElement, text: string): void {
  const span = el.querySelector('.d-label-text');
  if (span) span.textContent = text;
}
