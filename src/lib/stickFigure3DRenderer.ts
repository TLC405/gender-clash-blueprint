/**
 * TLC Battlecast / instanced, articulated 3D stick fighters.
 *
 * These are real Three.js 3D cylinder/sphere meshes (not flat sprite
 * billboards). Every human has stable per-unit anatomy and a unique gait.
 * The simulation remains 2D to support 2,200 units on mobile browsers.
 *
 * Primary references:
 * https://threejs.org/docs/pages/InstancedMesh.html
 * https://threejs.org/docs/pages/OrthographicCamera.html
 * https://threejs.org/manual/pages/tips.html
 */
import {
  AmbientLight, CircleGeometry, Color, CylinderGeometry, DirectionalLight,
  DynamicDrawUsage, Group, InstancedMesh, Matrix4, MeshBasicMaterial,
  MeshStandardMaterial, Object3D, OrthographicCamera, Scene, SphereGeometry,
  Vector3, WebGLRenderer, DoubleSide,
} from 'three';
import { FLAG_ALIVE, FLAG_LEADER, TEAM_MEN, type BattleSoA } from './battleSoA';
import { attackEnvelope, guardEnvelope, STRIKE_JAB, STRIKE_SHOVE } from './combatChoreography';
import { DEFAULT_TEAMS, type SandboxTeams } from './sandboxLoadouts';
import {
  getStickFigureVariant, getStickMotion, STICK_FIGHTER_PALETTES,
  STICK_FIGHTER_SEGMENTS, type StickFigureVariant,
} from './stickFigureVariants';

const UP = new Vector3(0, 1, 0);
const EMPTY = new Matrix4().makeScale(0, 0, 0);
const BONES = STICK_FIGHTER_SEGMENTS.length;

export interface StickFigure3DLayer {
  renderer: WebGLRenderer;
  scene: Scene;
  camera: OrthographicCamera;
  world: Group;
  body: InstancedMesh[];
  heads: InstancedMesh;
  torsos: InstancedMesh;
  hair: InstancedMesh;
  footwear: [InstancedMesh,InstancedMesh];
  eyes: [InstancedMesh,InstancedMesh];
  weapons: InstancedMesh;
  shadows: InstancedMesh;
  limbGeometry: CylinderGeometry;
  headGeometry: SphereGeometry;
  shadowGeometry: CircleGeometry;
  bodyMaterial: MeshStandardMaterial;
  headMaterial: MeshStandardMaterial;
  hairMaterial: MeshStandardMaterial;
  bootMaterial: MeshStandardMaterial;
  eyeMaterial: MeshStandardMaterial;
  weaponMaterial: MeshStandardMaterial;
  shadowMaterial: MeshBasicMaterial;
  capacity: number;
  paintedCount: number;
  appearanceKey: string;
  hidden: Uint8Array;
  variants: StickFigureVariant[];
  width: number;
  height: number;
  lastDraw: number;
  destroyed: boolean;
}

// Reuse the same CPU scratch geometry for every figure and every bone.
const dummy = new Object3D();
const delta = new Vector3();
const mid = new Vector3();
const leftHip = new Vector3();
const rightHip = new Vector3();
const pelvis = new Vector3();
const neck = new Vector3();
const leftShoulder = new Vector3();
const rightShoulder = new Vector3();
const leftElbow = new Vector3();
const rightElbow = new Vector3();
const leftHand = new Vector3();
const rightHand = new Vector3();
const leftKnee = new Vector3();
const rightKnee = new Vector3();
const leftFoot = new Vector3();
const rightFoot = new Vector3();
const head = new Vector3();
const weaponTip = new Vector3();

function limb(mesh: InstancedMesh, index: number, from: Vector3, to: Vector3, thickness: number): void {
  delta.subVectors(to, from);
  const length = Math.max(0.05, delta.length());
  dummy.position.copy(mid.copy(from).add(to).multiplyScalar(0.5));
  dummy.quaternion.setFromUnitVectors(UP, delta.multiplyScalar(1 / length));
  dummy.scale.set(thickness, length, thickness);
  dummy.updateMatrix();
  mesh.setMatrixAt(index, dummy.matrix);
}

function point(p: Vector3, x: number, y: number, z: number) {
  return p.set(x, y, z);
}

function bodyColor(index: number, men: boolean, leader: boolean) {
  if (leader) return 0xffd37a;
  const shades = men ? STICK_FIGHTER_PALETTES.men : STICK_FIGHTER_PALETTES.women;
  return shades[index % shades.length];
}

export function createStickFigure3DLayer(
  canvas: HTMLCanvasElement, width: number, height: number, capacity: number
): StickFigure3DLayer {
  const count = Math.max(1, Math.floor(capacity));
  // Instanced meshes reduce draw calls from O(fighters*limbs) to ~11.
  const renderer = new WebGLRenderer({
    canvas, alpha: true, antialias: false, powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  renderer.setSize(width, height, false);
  renderer.setClearColor(0x000000, 0);
  const scene = new Scene();
  scene.add(new AmbientLight(0xf1f4ff, 1.85));
  const key = new DirectionalLight(0xffffff, 2.1);
  key.position.set(-110, 150, 260);
  scene.add(key);
  const rim = new DirectionalLight(0x8fb5ff, 0.55);
  rim.position.set(130, 60, -100);
  scene.add(rim);
  const camera = new OrthographicCamera(-width / 2, width / 2, height / 2, -height / 2, 0.1, 1800);
  camera.position.set(0, 0, 850);
  camera.lookAt(0, 0, 0);
  const world = new Group();
  scene.add(world);

  const limbGeometry = new CylinderGeometry(0.9, 0.9, 1, 6, 1);
  const headGeometry = new SphereGeometry(1, 8, 6);
  const shadowGeometry = new CircleGeometry(1, 10);
  const bodyMaterial = new MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, metalness: 0.22, flatShading: true });
  const headMaterial = new MeshStandardMaterial({ color: 0xffffff, roughness: 0.75, metalness: 0.05, flatShading: true });
  const hairMaterial = new MeshStandardMaterial({color:0xffffff,roughness:.82,metalness:.02,flatShading:true});
  const bootMaterial = new MeshStandardMaterial({color:0x101d30,roughness:.65,metalness:.18});
  const eyeMaterial = new MeshStandardMaterial({color:0x162235,roughness:.3});
  const weaponMaterial = new MeshStandardMaterial({color:0xffffff,roughness:.38,metalness:.52});
  const shadowMaterial = new MeshBasicMaterial({
    color: 0x071019, transparent: true, opacity: 0.35,
    depthWrite: false, side: DoubleSide,
  });
  const body = Array.from({ length: BONES }, () => {
    const mesh = new InstancedMesh(limbGeometry, bodyMaterial, count);
    mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    mesh.frustumCulled = false;
    world.add(mesh);
    return mesh;
  });
  const heads = new InstancedMesh(headGeometry, headMaterial, count);
  heads.instanceMatrix.setUsage(DynamicDrawUsage);
  heads.frustumCulled = false;
  world.add(heads);
  const make = (geometry:SphereGeometry|CylinderGeometry,material:MeshStandardMaterial)=>{
    const mesh=new InstancedMesh(geometry,material,count);
    mesh.instanceMatrix.setUsage(DynamicDrawUsage);mesh.frustumCulled=false;world.add(mesh);return mesh;
  };
  // Human torso mass, sculpted hair, feet, facial eyes and gameplay equipment.
  const torsos=make(headGeometry,bodyMaterial);
  const hair=make(headGeometry,hairMaterial);
  const footwear:[InstancedMesh,InstancedMesh]=[make(headGeometry,bootMaterial),make(headGeometry,bootMaterial)];
  const eyes:[InstancedMesh,InstancedMesh]=[make(headGeometry,eyeMaterial),make(headGeometry,eyeMaterial)];
  const weapons=make(limbGeometry,weaponMaterial);
  const shadows = new InstancedMesh(shadowGeometry, shadowMaterial, count);
  shadows.instanceMatrix.setUsage(DynamicDrawUsage);
  shadows.frustumCulled = false;
  world.add(shadows);

  return {
    renderer, scene, camera, world, body, heads, torsos, hair, footwear, eyes, weapons, shadows,
    limbGeometry, headGeometry, shadowGeometry, bodyMaterial, headMaterial, hairMaterial, bootMaterial, eyeMaterial, weaponMaterial, shadowMaterial,
    capacity: count, paintedCount: 0, appearanceKey:'', hidden: new Uint8Array(count),
    variants: [], width, height, lastDraw: 0, destroyed: false,
  };
}

export function resizeStickFigure3DLayer(layer: StickFigure3DLayer, width: number, height: number): void {
  if (layer.destroyed) return;
  layer.width = width;
  layer.height = height;
  layer.camera.left = -width / 2;
  layer.camera.right = width / 2;
  layer.camera.top = height / 2;
  layer.camera.bottom = -height / 2;
  layer.camera.updateProjectionMatrix();
  layer.renderer.domElement.style.width = `${width}px`;
  layer.renderer.domElement.style.height = `${height}px`;
  layer.renderer.setSize(width, height, false);
}

function ensureColors(layer: StickFigure3DLayer, soa: BattleSoA, count: number, teams:SandboxTeams, rage:boolean) {
  const appearance=teams.women.furiosa+":"+teams.men.weapon+":"+teams.women.weapon+":"+rage;
  if(layer.appearanceKey!==appearance){layer.paintedCount=0;layer.appearanceKey=appearance;}
  if (layer.paintedCount >= count) return;
  for (let i = layer.paintedCount; i < count; i++) {
    const team = soa.teamID[i];
    const variant = getStickFigureVariant(i, team);
    layer.variants[i] = variant;
    const isMale=team===TEAM_MEN;
    const uniformColor = new Color(teams.women.furiosa&&!isMale?0xc8476e:rage?isMale?0x6fb6f3:0xf478b4:bodyColor(variant.shade, isMale, (soa.stateFlags[i] & FLAG_LEADER) !== 0));
    const skin = STICK_FIGHTER_PALETTES.skin[(variant.shade + i) % STICK_FIGHTER_PALETTES.skin.length];
    for (const mesh of layer.body) mesh.setColorAt(i, uniformColor);
    layer.torsos.setColorAt(i,uniformColor);
    layer.heads.setColorAt(i, new Color(skin));
    layer.hair.setColorAt(i,new Color(isMale?0x182238:0xf2c65e));
    layer.weapons.setColorAt(i,new Color(isMale?0x9ac9f8:0xfa95bd));
  }
  for (const mesh of layer.body) if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  for (const mesh of [layer.torsos,layer.hair,layer.weapons,layer.heads]) if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  layer.paintedCount = count;
}

/**
 * Draw a complete rig in a single pass. Each joint has an actual XYZ
 * coordinate, including alternating depth for legs and arms. Randomness is
 * seeded per unit, not regenerated every frame (no flicker or teleporting).
 */
function pose(layer: StickFigure3DLayer, soa: BattleSoA, i: number, seconds: number, reducedMotion: boolean, scale: number, teams:SandboxTeams) {
  const style = layer.variants[i];
  const speed = Math.hypot(soa.velX[i], soa.velY[i]);
  const moving = getStickMotion(style, seconds, speed, soa.stagger[i], reducedMotion);
  const male=soa.teamID[i]===TEAM_MEN;
  const furiosa=!male&&teams.women.furiosa;
  const s = scale * style.height * (furiosa?1.52:male?1.12:1.05);
  const baseX = soa.posX[i] - layer.width / 2;
  const baseY = layer.height / 2 - soa.posY[i];
  const z = style.depth;
  const hip = 1.9 * style.hips * s;
  const shoulder = 2.6 * style.shoulders * s * (furiosa?1.34:male?1.17:1);
  const walk = moving.stride;
  const front = soa.teamID[i] === TEAM_MEN ? 1 : -1;
  // These angles come from the same fixed-step combat event as the hit impulse.
  const strike = reducedMotion ? 0 : attackEnvelope(soa.attackTimer[i]);
  const jab = soa.attackKind[i] === STRIKE_JAB ? strike : 0;
  const shove = soa.attackKind[i] === STRIKE_SHOVE ? strike : 0;
  const guard = reducedMotion ? 0 : guardEnvelope(soa.guardTimer[i], soa.attackTimer[i]);
  const tilt = moving.lean * s + front * (jab * 0.8 + shove * 1.2) * s;
  const recoil = moving.recoil;
  const height = (1 - recoil * 0.16);
  const pivotY = baseY + 8.1 * s * height;
  const neckY = baseY + 15.3 * s * height;
  const depthSwing = walk * 2.1 * s;

  point(pelvis, baseX + tilt * 0.27, pivotY, z);
  point(neck, baseX + tilt, neckY, z + 0.9 * s);
  point(leftHip, pelvis.x - hip, pivotY, z - 0.6 * s);
  point(rightHip, pelvis.x + hip, pivotY, z + 0.6 * s);
  point(leftShoulder, neck.x - shoulder, neckY - 0.3 * s, z - 0.4 * s);
  point(rightShoulder, neck.x + shoulder, neckY - 0.3 * s, z + 0.4 * s);
  point(leftKnee, baseX - hip * 0.9 - walk * 1.1 * s, baseY + 4.4 * s, z - 0.7 * s + depthSwing);
  point(rightKnee, baseX + hip * 0.9 + walk * 1.1 * s, baseY + 4.4 * s, z + 0.7 * s - depthSwing);
  point(leftFoot, baseX - hip * 1.15 - walk * 2.25 * s, baseY, z + depthSwing * 1.5);
  point(rightFoot, baseX + hip * 1.15 + walk * 2.25 * s, baseY, z - depthSwing * 1.5);
  // Bracing tucks the hands near the face; a jab throws one fist forward,
  // while a heavy shove drives BOTH arms forward. No detached limb endpoints.
  point(leftElbow,
    leftShoulder.x - (1.7 + walk*1.2) * s + front * shove * 3.2*s,
    neckY - (4.2 - recoil*1.2 - guard*2.2 - shove*2) * s,
    z - 1.6*s - depthSwing);
  point(rightElbow,
    rightShoulder.x + (1.7 - walk*1.2) * s + front*(jab*3.5 + shove*3.2)*s,
    neckY - (4.2 - recoil*1.2 - guard*2.2 - jab*2.3 - shove*2)*s,
    z + 1.6*s + depthSwing);
  point(leftHand,
    leftElbow.x - 1.2*s + front*(shove*5.1 + guard*0.6)*s,
    leftElbow.y - 3.2*s + (shove*3 + guard*5)*s,
    leftElbow.z - (1.8 - shove*0.6)*s);
  point(rightHand,
    rightElbow.x + 1.2*s + front*(jab*6.3 + shove*5.1 + guard*0.6)*s,
    rightElbow.y - 3.2*s + (jab*4.1 + shove*3 + guard*5)*s,
    rightElbow.z + (1.8 + jab*1.7)*s);
  point(head, neck.x + 0.45 * s, neckY + 3.8 * s, z + 0.8 * s);
  const radius = style.thickness * s * (furiosa?1.55:male?1.23:1.03);
  const m = layer.body;
  // Solid chest plate and muscular abdominal volume make the rigs read human.
  dummy.position.copy(pelvis).lerp(neck,.57);
  dummy.quaternion.identity();
  dummy.scale.set(shoulder*1.18, 5.3*s, 1.7*s);
  dummy.updateMatrix();layer.torsos.setMatrixAt(i,dummy.matrix);
  limb(m[0], i, pelvis, neck, 1.05 * radius);
  limb(m[1], i, leftShoulder, leftElbow, 0.57 * radius);
  limb(m[2], i, leftElbow, leftHand, 0.46 * radius);
  limb(m[3], i, rightShoulder, rightElbow, 0.57 * radius);
  limb(m[4], i, rightElbow, rightHand, 0.46 * radius);
  limb(m[5], i, leftHip, leftKnee, 0.72 * radius);
  limb(m[6], i, leftKnee, leftFoot, 0.58 * radius);
  limb(m[7], i, rightHip, rightKnee, 0.72 * radius);
  limb(m[8], i, rightKnee, rightFoot, 0.58 * radius);

  dummy.position.copy(head);
  dummy.quaternion.identity();
  dummy.scale.setScalar(2.45 * s);
  dummy.updateMatrix();
  layer.heads.setMatrixAt(i, dummy.matrix);
  // Blonde sculpted hair; bald in Furiosa. Men wear short dark textured hair.
  if(furiosa){layer.hair.setMatrixAt(i,EMPTY);}
  else{
    dummy.position.set(head.x,head.y+1.55*s,head.z-.25*s);
    dummy.scale.set(2.55*s,male?1.05*s:1.85*s,2.55*s);
    dummy.updateMatrix();layer.hair.setMatrixAt(i,dummy.matrix);
  }
  for(const [j,sign] of [-1,1].entries()){
    dummy.position.set(head.x+sign*1.05*s,head.y-.2*s,head.z+2.18*s);
    dummy.scale.set(.35*s,.35*s,.28*s);
    dummy.updateMatrix();layer.eyes[j].setMatrixAt(i,dummy.matrix);
  }
  for(const [j,foot] of [leftFoot,rightFoot].entries()){
    dummy.position.copy(foot);dummy.position.z+=.6*s;
    dummy.scale.set(2.4*s,.9*s,1.45*s);
    dummy.updateMatrix();layer.footwear[j].setMatrixAt(i,dummy.matrix);
  }
  const equipped=male?teams.men.weapon:teams.women.weapon;
  if(equipped==="fists"){layer.weapons.setMatrixAt(i,EMPTY);}
  else{
    const sword=male?(equipped==="swords"||equipped==="guns+swords"):(equipped==="lipstick+makeup"||equipped==="lipstick");
    const hand=rightHand;
    point(weaponTip,hand.x+front*(sword?5:4)*s,hand.y+(sword?7:0)*s,hand.z+1.1*s);
    limb(layer.weapons,i,hand,weaponTip,sword?.45*s:1.65*s);
  }

  dummy.position.set(baseX, baseY - 1 * s, z - 3.1);
  dummy.quaternion.identity();
  dummy.scale.set(4.1 * s, 1.7 * s, 1);
  dummy.updateMatrix();
  layer.shadows.setMatrixAt(i, dummy.matrix);
}

export function renderStickFigure3DLayer(
  layer: StickFigure3DLayer, soa: BattleSoA,
  camera: { x: number; y: number; zoom: number; w: number; h: number },
  reducedMotion = false, timeSeconds = 0,
  teams:SandboxTeams=DEFAULT_TEAMS, rage=false
): void {
  if (layer.destroyed) return;
  const count = Math.min(layer.capacity, soa.unitCount);
  // 30fps rig updates for large hordes; simulation and inputs remain 60Hz.
  const now = typeof performance === 'undefined' ? 0 : performance.now();
  if (count > 1600 && now - layer.lastDraw < 32) return;
  layer.lastDraw = now;

  ensureColors(layer, soa, count, teams, rage);
  layer.world.position.set(camera.x, -camera.y, 0);
  layer.world.scale.setScalar(camera.zoom);
  const tinyArena = Math.min(layer.width, layer.height);
  // With a maximum of 100, favor readable cinematic human proportions.
  const scale = Math.max(1.08, Math.min(1.55, tinyArena / 240)) * (count <= 100 ? 1.15 : .86);
  for (let i = 0; i < count; i++) {
    if ((soa.stateFlags[i] & FLAG_ALIVE) === 0) {
      if (!layer.hidden[i]) {
        for (const mesh of layer.body) mesh.setMatrixAt(i, EMPTY);
        layer.heads.setMatrixAt(i, EMPTY);
        for(const mesh of [layer.torsos,layer.hair,layer.weapons,...layer.footwear,...layer.eyes])mesh.setMatrixAt(i,EMPTY);
        layer.shadows.setMatrixAt(i, EMPTY);
        layer.hidden[i] = 1;
      }
      continue;
    }
    layer.hidden[i] = 0;
    pose(layer, soa, i, timeSeconds, reducedMotion, scale,teams);
  }
  for (const mesh of layer.body) mesh.instanceMatrix.needsUpdate = true;
  layer.heads.instanceMatrix.needsUpdate = true;
  for(const mesh of [layer.torsos,layer.hair,layer.weapons,...layer.footwear,...layer.eyes])mesh.instanceMatrix.needsUpdate=true;
  layer.shadows.instanceMatrix.needsUpdate = true;
  layer.renderer.render(layer.scene, layer.camera);
}

export function destroyStickFigure3DLayer(layer: StickFigure3DLayer): void {
  if (layer.destroyed) return;
  layer.destroyed = true;
  layer.limbGeometry.dispose();
  layer.headGeometry.dispose();
  layer.shadowGeometry.dispose();
  layer.bodyMaterial.dispose();
  layer.headMaterial.dispose();
  layer.hairMaterial.dispose();layer.bootMaterial.dispose();layer.eyeMaterial.dispose();layer.weaponMaterial.dispose();
  layer.shadowMaterial.dispose();
  layer.renderer.dispose();
  layer.renderer.forceContextLoss();
}
