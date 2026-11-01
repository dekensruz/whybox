// The tutor in 3D: a stylized character built from simple shapes, in the flat shaded style of the illustrations,
// with ink outlines. Her face and arms follow a gesture (explain, point, think...) and her lips follow her voice.
import * as THREE from 'three';

export type TutorGesture = 'idle' | 'explain' | 'point' | 'think' | 'happy' | 'encourage' | 'celebrate';

const INK = 0x14161a;
const SKIN = 0x8a5a3c;
const SKIN_SHADE = 0x75492f;
const HAIR = 0x1c1714;
const SHIRT = 0x86a6b5;
const SCARF = 0xf2a900;

/**
 * Where each part goes for a gesture. Arms, in radians, the same numbers for both sides (mirrored):
 * x raises the arm forward (negative), z opens it outward, bend folds the forearm inward and up (negative unfolds it).
 * Gestures stay in the plane of the screen, where a child sees them.
 */
interface ArmPose {
  x: number;
  z: number;
  bend: number;
}

interface Pose {
  left: ArmPose;
  right: ArmPose;
  smile: number;
  brows: number;
  tilt: number;
  lookUp: number;
}

const REST: ArmPose = { x: 0, z: 0.12, bend: 0.15 };

const POSES: Record<TutorGesture, Pose> = {
  idle: { left: REST, right: REST, smile: 0.35, brows: 0, tilt: 0, lookUp: 0 },
  // Open hands in front of the chest.
  // (Hands that come up must also come forward, or they disappear into the body.)
  explain: { left: { x: -0.9, z: 0.5, bend: 2.2 }, right: { x: -0.9, z: 0.5, bend: 2.2 }, smile: 0.45, brows: 0.04, tilt: 0, lookUp: 0 },
  // The right arm raised toward the experiment above.
  point: { left: REST, right: { x: -0.4, z: 2.5, bend: -0.25 }, smile: 0.45, brows: 0.05, tilt: 0.08, lookUp: 0.03 },
  // A hand up to the chin, the other arm folded at the waist, the head tilted.
  think: { left: { x: -1.45, z: -0.1, bend: 2.9 }, right: { x: -0.8, z: 0.2, bend: 1.5 }, smile: 0.05, brows: 0.07, tilt: 0.14, lookUp: 0.05 },
  happy: { left: { x: -0.1, z: 0.35, bend: 0.7 }, right: { x: -0.1, z: 0.35, bend: 0.7 }, smile: 1, brows: 0.06, tilt: -0.05, lookUp: 0 },
  // One hand raised beside the shoulder, a warm nod.
  encourage: { left: REST, right: { x: -0.9, z: 0.45, bend: 2.3 }, smile: 0.75, brows: 0.05, tilt: 0.1, lookUp: 0 },
  celebrate: { left: { x: 0, z: 2.6, bend: -0.2 }, right: { x: 0, z: 2.6, bend: -0.2 }, smile: 1, brows: 0.1, tilt: 0, lookUp: 0.03 },
};

/** Celebrations are short: after this, the tutor stays happy. */
const CELEBRATION_SECONDS = 2.6;

const toonGradient = (() => {
  let texture: THREE.DataTexture | null = null;
  return () => {
    if (!texture) {
      texture = new THREE.DataTexture(new Uint8Array([110, 110, 110, 255, 185, 185, 185, 255, 255, 255, 255, 255]), 3, 1, THREE.RGBAFormat);
      texture.minFilter = THREE.NearestFilter;
      texture.magFilter = THREE.NearestFilter;
      texture.needsUpdate = true;
    }
    return texture;
  };
})();

const toon = (color: number) => new THREE.MeshToonMaterial({ color, gradientMap: toonGradient() });
const inkMaterial = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide });

/** A mesh with an ink outline: the same shape, slightly larger, drawn inside out in black. */
const outlined = (geometry: THREE.BufferGeometry, color: number, thickness = 0.045) => {
  const mesh = new THREE.Mesh(geometry, toon(color));
  const outline = new THREE.Mesh(geometry, inkMaterial);
  outline.scale.setScalar(1 + thickness);
  mesh.add(outline);
  return mesh;
};

/** A lip line whose two morph targets make it smile or frown. */
const lip = (width: number, radius: number) => {
  const curve = (smile: number) =>
    new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(-width, 0.07 * smile, 0),
      new THREE.Vector3(0, -0.09 * smile, 0.05),
      new THREE.Vector3(width, 0.07 * smile, 0),
    );
  const geometry = new THREE.TubeGeometry(curve(0), 16, radius, 6, false);
  geometry.morphAttributes.position = [
    new THREE.TubeGeometry(curve(1), 16, radius, 6, false).attributes.position,
    new THREE.TubeGeometry(curve(-1), 16, radius, 6, false).attributes.position,
  ];
  const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: 0x4a241c }));
  mesh.updateMorphTargets();
  return mesh;
};

const arm = (side: 1 | -1) => {
  const shoulder = new THREE.Group();
  shoulder.position.set(side * 1.0, 1.5, 0);
  const upper = outlined(new THREE.CapsuleGeometry(0.21, 0.72, 6, 16), SHIRT);
  upper.position.y = -0.48;
  shoulder.add(upper);
  const elbow = new THREE.Group();
  elbow.position.y = -0.98;
  shoulder.add(elbow);
  const forearm = outlined(new THREE.CapsuleGeometry(0.17, 0.62, 6, 16), SKIN);
  forearm.position.y = -0.42;
  elbow.add(forearm);
  const hand = outlined(new THREE.SphereGeometry(0.2, 16, 12), SKIN);
  hand.position.y = -0.86;
  hand.scale.set(1, 1.15, 0.8);
  elbow.add(hand);
  return { shoulder, elbow };
};

export interface Tutor {
  setGesture: (gesture: TutorGesture) => void;
  /** Called every frame with how loud the voice is (0 to 1). */
  setVoiceLevel: (read: () => number) => void;
  dispose: () => void;
}

export function createTutor(canvas: HTMLCanvasElement): Tutor {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  camera.position.set(0.35, 2.1, 9.5);
  camera.lookAt(0, 1.95, 0);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xd9c8a8, 1.4));
  const sun = new THREE.DirectionalLight(0xffffff, 1.8);
  sun.position.set(3, 5, 6);
  scene.add(sun);

  const body = new THREE.Group();
  scene.add(body);

  // Torso, scarf and neck
  const torso = outlined(new THREE.CapsuleGeometry(1.02, 1.15, 8, 28), SHIRT);
  torso.position.y = 0.55;
  torso.scale.set(1, 1, 0.66);
  body.add(torso);
  const scarf = outlined(new THREE.TorusGeometry(0.6, 0.2, 12, 32), SCARF);
  scarf.rotation.x = Math.PI / 2;
  scarf.position.y = 1.8;
  scarf.scale.set(1, 0.8, 1);
  body.add(scarf);
  const tail = outlined(new THREE.CapsuleGeometry(0.16, 0.75, 6, 12), SCARF);
  tail.position.set(0.32, 1.2, 0.6);
  tail.rotation.z = 0.18;
  body.add(tail);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.34, 0.55, 20), toon(SKIN));
  neck.position.y = 2.0;
  body.add(neck);

  // Arms
  const left = arm(-1);
  const right = arm(1);
  body.add(left.shoulder, right.shoulder);

  // Head
  const head = new THREE.Group();
  head.position.y = 2.75;
  body.add(head);
  const skull = outlined(new THREE.SphereGeometry(0.95, 40, 28), SKIN, 0.035);
  skull.scale.set(0.92, 1.05, 0.95);
  head.add(skull);

  // Short curly hair: a cap and many small curls, instanced so they cost one draw call.
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.99, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.4), toon(HAIR));
  cap.scale.set(0.95, 1.05, 0.98);
  cap.rotation.x = -0.4;
  head.add(cap);
  const curlDirections: THREE.Vector3[] = [];
  for (let i = 0; i < 220 && curlDirections.length < 90; i++) {
    const y = 1 - (i / 219) * 2;
    const radius = Math.sqrt(1 - y * y);
    const angle = i * 2.399963;
    const direction = new THREE.Vector3(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
    // Curls over the top and the back, leaving the forehead and the eyebrows clear.
    const forehead = direction.z > 0.35 && direction.y < 0.62;
    if (!forehead && (direction.y > 0.3 || (direction.z < 0.1 && direction.y > -0.3))) curlDirections.push(direction);
  }
  const curls = new THREE.InstancedMesh(new THREE.SphereGeometry(0.2, 10, 8), toon(HAIR), curlDirections.length);
  const placement = new THREE.Matrix4();
  curlDirections.forEach((direction, index) => {
    const size = 0.9 + ((index * 37) % 10) / 25;
    placement.compose(
      new THREE.Vector3(direction.x * 0.9, direction.y * 1.0 + 0.05, direction.z * 0.92),
      new THREE.Quaternion(),
      new THREE.Vector3(size, size, size),
    );
    curls.setMatrixAt(index, placement);
  });
  head.add(curls);

  [-1, 1].forEach((side) => {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 12), toon(SKIN));
    ear.position.set(side * 0.86, -0.05, 0);
    head.add(ear);
  });
  const earring = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), toon(0x8a9a6b));
  earring.position.set(-0.88, -0.27, 0.05);
  head.add(earring);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), toon(SKIN_SHADE));
  nose.position.set(0, -0.12, 0.9);
  nose.scale.set(1.1, 0.85, 0.8);
  head.add(nose);

  // Eyes and eyebrows
  const eyes = [-1, 1].map((side) => {
    const eye = new THREE.Group();
    eye.position.set(side * 0.32, 0.1, 0.8);
    const white = new THREE.Mesh(new THREE.SphereGeometry(0.15, 20, 14), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    white.scale.set(1, 1.1, 0.5);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.085, 16, 12), new THREE.MeshBasicMaterial({ color: INK }));
    pupil.position.z = 0.06;
    eye.add(white, pupil);
    head.add(eye);
    return { eye, pupil };
  });
  const brows = [-1, 1].map((side) => {
    const brow = new THREE.Mesh(new THREE.CapsuleGeometry(0.04, 0.24, 4, 8), new THREE.MeshBasicMaterial({ color: INK }));
    brow.rotation.z = Math.PI / 2;
    brow.position.set(side * 0.32, 0.36, 0.84);
    head.add(brow);
    return brow;
  });

  // Mouth: the upper lip stays, the inside and the lower lip open with the voice.
  const mouth = new THREE.Group();
  mouth.position.set(0, -0.42, 0.85);
  head.add(mouth);
  const inside = new THREE.Mesh(new THREE.CircleGeometry(0.19, 24), new THREE.MeshBasicMaterial({ color: 0x3a1e1a }));
  inside.position.z = -0.01;
  const upperLip = lip(0.22, 0.03);
  const lowerLip = lip(0.16, 0.028);
  mouth.add(inside, upperLip, lowerLip);

  // ------------------------------------------------------------ animation
  let gesture: TutorGesture = 'idle';
  let gestureSince = 0;
  let readLevel = () => 0;
  let level = 0;
  let nextBlink = 2;
  // Each arm gets its own copy: the rest pose is one object shared by both sides.
  const current: Pose = { ...POSES.idle, left: { ...REST }, right: { ...REST } };
  const clock = new THREE.Clock();
  let frame = 0;

  const resize = () => {
    const { clientWidth, clientHeight } = canvas;
    if (!clientWidth || !clientHeight) return;
    renderer.setSize(clientWidth, clientHeight, false);
    camera.aspect = clientWidth / clientHeight;
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();

  const approach = (from: number, to: number, k: number) => from + (to - from) * k;

  const tick = () => {
    frame = requestAnimationFrame(tick);
    if (document.hidden) return;
    // Slow phones draw few frames: a large step still reaches the pose, without a jump after a pause.
    const dt = Math.min(0.25, clock.getDelta());
    const t = clock.elapsedTime;
    const k = 1 - Math.exp(-dt * 7);

    const active = gesture === 'celebrate' && t - gestureSince > CELEBRATION_SECONDS ? 'happy' : gesture;
    const target = POSES[active];
    (['left', 'right'] as const).forEach((side) => {
      (['x', 'z', 'bend'] as const).forEach((key) => (current[side][key] = approach(current[side][key], target[side][key], k)));
    });
    current.smile = approach(current.smile, target.smile, k);
    current.brows = approach(current.brows, target.brows, k);
    current.tilt = approach(current.tilt, target.tilt, k);
    current.lookUp = approach(current.lookUp, target.lookUp, k);

    level = approach(level, readLevel(), 1 - Math.exp(-dt * 18));
    const talking = level > 0.04;

    // Arms, with a little life: open palms bob when she explains while speaking, celebration waves.
    const bob = active === 'explain' && talking ? Math.sin(t * 5) * 0.12 * level : 0;
    const wave = active === 'celebrate' ? Math.sin(t * 9) * 0.15 : 0;
    // The left arm (negative x) opens with a negative z: its numbers are mirrored here.
    left.shoulder.rotation.set(current.left.x, 0, -current.left.z - wave);
    left.elbow.rotation.set(-0.3, 0, current.left.bend + bob);
    right.shoulder.rotation.set(current.right.x, 0, current.right.z + wave);
    right.elbow.rotation.set(-0.3, 0, -current.right.bend - bob);

    // Breathing, a calm sway, small nods while speaking, a hop when celebrating.
    torso.scale.y = 1 + Math.sin(t * 1.8) * 0.012;
    body.position.y = active === 'celebrate' ? Math.abs(Math.sin(t * 6)) * 0.12 : 0;
    head.rotation.set(
      -current.lookUp * 2 + (talking ? Math.sin(t * 7) * 0.04 * level : 0),
      Math.sin(t * 0.6) * 0.07,
      current.tilt + Math.sin(t * 0.45) * 0.02,
    );

    // Face
    if (t > nextBlink) nextBlink = t + 2.4 + Math.random() * 3;
    const blink = nextBlink - t < 0.12 ? 0.1 : 1;
    eyes.forEach(({ eye, pupil }) => {
      eye.scale.y = approach(eye.scale.y, blink, 0.6);
      pupil.position.y = current.lookUp;
    });
    brows.forEach((brow, index) => {
      brow.position.y = 0.36 + current.brows + level * 0.05;
      brow.rotation.z = Math.PI / 2 + (index ? -1 : 1) * (active === 'think' ? 0.18 : 0.05);
    });
    const open = Math.min(1, level * 1.3);
    const smile = Math.max(-1, Math.min(1, current.smile * (1 - open * 0.5)));
    [upperLip, lowerLip].forEach((part) => {
      part.morphTargetInfluences![0] = Math.max(0, smile);
      part.morphTargetInfluences![1] = Math.max(0, -smile);
    });
    inside.scale.set(0.9 + open * 0.2, 0.05 + open * 0.75, 1);
    inside.position.y = -0.08 * open;
    lowerLip.position.y = -0.17 * open - 0.01;

    renderer.render(scene, camera);
  };
  frame = requestAnimationFrame(tick);

  return {
    setGesture(next) {
      if (next === gesture) return;
      gesture = next;
      gestureSince = clock.elapsedTime;
    },
    setVoiceLevel(read) {
      readLevel = read;
    },
    dispose() {
      cancelAnimationFrame(frame);
      observer.disconnect();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          (Array.isArray(object.material) ? object.material : [object.material]).forEach((material) => material.dispose());
        }
      });
      renderer.dispose();
    },
  };
}
