// 3D renderer built on three.js: the experiment creates its objects once in setup(s), then moves them in update().
// The learner turns the scene with one finger and zooms with two. Labels follow their objects and never overlap.
import {
  AmbientLight, ArrowHelper, Box3, BoxGeometry, BufferGeometry, Color, ConeGeometry, CylinderGeometry, DirectionalLight,
  Float32BufferAttribute, GridHelper, Group, Line, LineBasicMaterial, LineDashedMaterial, Mesh, MeshStandardMaterial,
  PerspectiveCamera, PlaneGeometry, PointLight, Points, PointsMaterial, Scene, Sphere, SphereGeometry, TorusGeometry, Vector3,
  WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { COLORS } from './core.js';
import { drawLabels } from './labels.js';

const toVector = (value) => (Array.isArray(value) ? new Vector3(value[0] || 0, value[1] || 0, value[2] || 0) : value.clone());

export function createRenderer3d(options) {
  let renderer, overlay, overlayContext, camera, controls, scene, width, height, objects, ambient, sunlight;
  const labels = [];
  const flows = [];

  const material = (o = {}) =>
    new MeshStandardMaterial({
      color: new Color(o.color || COLORS.surface),
      roughness: o.roughness === undefined ? 0.75 : o.roughness,
      metalness: 0,
      transparent: o.opacity !== undefined && o.opacity < 1,
      opacity: o.opacity === undefined ? 1 : o.opacity,
      emissive: o.emissive ? new Color(o.color || COLORS.accent) : new Color(0x000000),
      emissiveIntensity: o.emissive ? (typeof o.emissive === 'number' ? o.emissive : 1) : 0,
    });

  const place = (object, o = {}) => {
    if (o.position) object.position.copy(toVector(o.position));
    if (o.rotation) object.rotation.set(o.rotation[0] || 0, o.rotation[1] || 0, o.rotation[2] || 0);
    (o.parent || scene).add(object);
    // Small conveniences for update(): obj.at(x, y, z), obj.setColor(color), obj.setOpacity(value).
    object.at = (x, y, z) => object.position.set(x, y, z);
    if (object.material && object.material.color) {
      object.setColor = (color) => object.material.color.set(color);
      object.setOpacity = (value) => {
        object.material.transparent = value < 1;
        object.material.opacity = value;
      };
    }
    return object;
  };

  const mesh = (geometry, o) => place(new Mesh(geometry, material(o)), o);

  const s = {
    colors: COLORS,
    sphere: (radius, o = {}) => mesh(new SphereGeometry(radius, o.segments || 32, Math.max(12, (o.segments || 32) / 2)), o),
    box: (w, h, d, o = {}) => mesh(new BoxGeometry(w, h, d), o),
    cylinder: (radiusTop, radiusBottom, h, o = {}) => mesh(new CylinderGeometry(radiusTop, radiusBottom, h, o.segments || 32), o),
    cone: (radius, h, o = {}) => mesh(new ConeGeometry(radius, h, o.segments || 32), o),
    torus: (radius, tube, o = {}) => mesh(new TorusGeometry(radius, tube, 16, o.segments || 48), o),
    /** A horizontal surface (ground, water, table), centred on its position. */
    plane: (w, d, o = {}) => {
      const plane = mesh(new PlaneGeometry(w, d), o);
      plane.rotation.x = -Math.PI / 2;
      return plane;
    },
    group: (o = {}) => place(new Group(), o),
    grid: (size = 10, o = {}) => place(new GridHelper(size, o.divisions || size, new Color(COLORS.line), new Color(COLORS.line)), o),
    line(points, o = {}) {
      const geometry = new BufferGeometry().setFromPoints(points.map(toVector));
      const lineMaterial = o.dash
        ? new LineDashedMaterial({ color: o.color || COLORS.ink, dashSize: 0.2, gapSize: 0.15 })
        : new LineBasicMaterial({ color: o.color || COLORS.ink });
      const line = place(new Line(geometry, lineMaterial), o);
      line.setPoints = (next) => {
        line.geometry.setFromPoints(next.map(toVector));
        if (o.dash) line.computeLineDistances();
      };
      if (o.dash) line.computeLineDistances();
      return line;
    },
    arrow(from, to, o = {}) {
      const start = toVector(from);
      const direction = toVector(to).sub(start);
      const length = Math.max(direction.length(), 1e-6);
      const arrow = place(new ArrowHelper(direction.normalize(), start, length, new Color(o.color || COLORS.ink), o.head || length * 0.2, (o.head || length * 0.2) * 0.55), o);
      arrow.set = (nextFrom, nextTo) => {
        const a = toVector(nextFrom);
        const d = toVector(nextTo).sub(a);
        const l = Math.max(d.length(), 1e-6);
        arrow.position.copy(a);
        arrow.setDirection(d.normalize());
        arrow.setLength(l, o.head || l * 0.2, (o.head || l * 0.2) * 0.55);
      };
      return arrow;
    },
    /**
     * A light source in the scene (the Sun, a lamp). The default soft lighting then fades almost entirely,
     * so the side facing away is truly dark: day and night, phases of the Moon, shadows.
     */
    light: (position, o = {}) => {
      ambient.intensity = 0.18;
      sunlight.visible = false;
      // White, with no falloff (decay 0) and a calibrated intensity: objects keep their true colors.
      return place(new PointLight(new Color('#ffffff'), 3.2, 0, 0), { position });
    },
    /** Dots moving along a path, animated by the kit: electrons, water, blood, light. Change flow.speed in update(). */
    flow(points, o = {}) {
      const path = points.map(toVector);
      const count = o.count || 24;
      const geometry = new BufferGeometry();
      geometry.setAttribute('position', new Float32BufferAttribute(new Float32Array(count * 3), 3));
      const dots = place(new Points(geometry, new PointsMaterial({ color: o.color || COLORS.ink, size: o.size || 0.12 })), o);
      dots.speed = o.speed === undefined ? 1 : o.speed;
      dots.offset = 0;
      dots.path = path;
      dots.count = count;
      dots.setPath = (next) => (dots.path = next.map(toVector));
      flows.push(dots);
      return dots;
    },
    /** A label that follows a point or an object. Returns { setText, setTarget, visible }. */
    label(text, target, o = {}) {
      const label = { text: String(text), target, color: o.color || COLORS.ink, priority: o.priority || 0, visible: true };
      label.setText = (next) => (label.text = String(next));
      label.setTarget = (next) => (label.target = next);
      labels.push(label);
      return label;
    },
  };

  const pointAlong = (path, distance) => {
    let total = 0;
    const lengths = [];
    for (let i = 1; i < path.length; i++) {
      lengths.push(path[i].distanceTo(path[i - 1]));
      total += lengths[i - 1];
    }
    if (!total) return path[0];
    let d = ((distance % total) + total) % total;
    for (let j = 0; j < lengths.length; j++) {
      if (d <= lengths[j]) return path[j].clone().lerp(path[j + 1], lengths[j] ? d / lengths[j] : 0);
      d -= lengths[j];
    }
    return path[path.length - 1];
  };

  const updateFlows = (delta) => {
    flows.forEach((dots) => {
      if (dots.path.length < 2) return;
      dots.offset += dots.speed * delta;
      let total = 0;
      for (let i = 1; i < dots.path.length; i++) total += dots.path[i].distanceTo(dots.path[i - 1]);
      const positions = dots.geometry.attributes.position;
      for (let n = 0; n < dots.count; n++) {
        const point = pointAlong(dots.path, (n * total) / dots.count + dots.offset);
        positions.setXYZ(n, point.x, point.y, point.z);
      }
      positions.needsUpdate = true;
    });
  };

  const resize = () => {
    width = renderer.domElement.parentNode.clientWidth || 360;
    height = Math.round(Math.min(520, Math.max(280, width * 0.78)));
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    framed = false;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    overlay.width = Math.round(width * dpr);
    overlay.height = Math.round(height * dpr);
    overlay.style.width = `${width}px`;
    overlay.style.height = `${height}px`;
    overlayContext.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  let lastSeconds = 0;
  let framed = false;

  // Screen boxes of the visible objects, so labels are placed beside them rather than on top.
  const projectedObstacles = () => {
    const boxes = [];
    const center = new Vector3();
    const edge = new Vector3();
    scene.traverse((object) => {
      if (!object.isMesh || !object.visible || !object.geometry) return;
      if (!object.geometry.boundingSphere) object.geometry.computeBoundingSphere();
      const sphere = object.geometry.boundingSphere;
      object.getWorldPosition(center);
      const radius = sphere.radius * object.getWorldScale(edge).x;
      const screenCenter = center.clone().project(camera);
      if (screenCenter.z > 1) return;
      const screenEdge = center.clone().add(camera.up.clone().multiplyScalar(radius)).project(camera);
      const r = Math.abs(screenEdge.y - screenCenter.y) * (height / 2);
      // Large surfaces (ground, water) are backgrounds, not obstacles.
      if (r < 4 || r > Math.min(width, height) * 0.45) return;
      const x = ((screenCenter.x + 1) / 2) * width;
      const y = ((1 - screenCenter.y) / 2) * height;
      boxes.push({ x: x - r, y: y - r, w: 2 * r, h: 2 * r });
    });
    return boxes;
  };

  // Moves the camera back along its direction until the whole scene fits, on any screen shape.
  const frameScene = () => {
    const bounds = new Box3();
    scene.traverse((object) => {
      if (object.isMesh || object.isLine || object.isPoints) bounds.expandByObject(object);
    });
    if (bounds.isEmpty()) return;
    const sphere = bounds.getBoundingSphere(new Sphere());
    const view = options.camera || {};
    const target = view.target ? toVector(view.target) : sphere.center;
    const radius = sphere.radius + sphere.center.distanceTo(target);
    const vertical = (camera.fov * Math.PI) / 180;
    const horizontal = 2 * Math.atan(Math.tan(vertical / 2) * camera.aspect);
    const distance = (radius / Math.sin(Math.min(vertical, horizontal) / 2)) * 1.05;
    const direction = camera.position.clone().sub(controls.target).normalize();
    controls.target.copy(target);
    camera.position.copy(target.clone().add(direction.clone().multiplyScalar(distance)));
    camera.updateMatrixWorld();

    // The bounding sphere is cautious (a flat orbit looks much smaller than its sphere): tighten using what is
    // actually on screen, so the scene fills about 85% of the frame.
    let fitted = distance;
    for (let pass = 0; pass < 3; pass++) {
      let extent = 0;
      [bounds.min.x, bounds.max.x].forEach((x) =>
        [bounds.min.y, bounds.max.y].forEach((y) =>
          [bounds.min.z, bounds.max.z].forEach((z) => {
            const p = new Vector3(x, y, z).project(camera);
            extent = Math.max(extent, Math.abs(p.x), Math.abs(p.y));
          }),
        ),
      );
      if (!extent || !isFinite(extent)) break;
      fitted = Math.min(distance, fitted * (extent / 0.85));
      camera.position.copy(target.clone().add(direction.clone().multiplyScalar(fitted)));
      camera.updateMatrixWorld();
    }
    controls.minDistance = fitted * 0.35;
    controls.maxDistance = fitted * 2.5;
    controls.update();
    framed = true;
  };

  return {
    mount(stage) {
      renderer = new WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
      renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio || 1));
      renderer.setClearColor(new Color(options.background || COLORS.surface));
      stage.appendChild(renderer.domElement);
      overlay = document.createElement('canvas');
      overlay.className = 'wb-overlay';
      overlay.setAttribute('data-whybox-overlay', '');
      stage.appendChild(overlay);
      overlayContext = overlay.getContext('2d');

      scene = new Scene();
      ambient = new AmbientLight(0xffffff, 0.9);
      scene.add(ambient);
      sunlight = new DirectionalLight(0xffffff, 2);
      sunlight.position.set(5, 10, 7);
      scene.add(sunlight);

      const view = options.camera || {};
      camera = new PerspectiveCamera(view.fov || 45, 1, 0.05, 2000);
      camera.position.copy(toVector(view.position || [6, 4, 8]));
      controls = new OrbitControls(camera, renderer.domElement);
      controls.target.copy(toVector(view.target || [0, 0, 0]));
      controls.enableDamping = true;
      controls.enablePan = false;
      controls.autoRotate = Boolean(options.autoRotate);
      controls.autoRotateSpeed = 0.6;
      controls.update();
      renderer.domElement.style.touchAction = 'none';

      resize();
      objects = (options.setup && options.setup(s)) || {};
    },
    resize,
    render(values, measurements, seconds) {
      const delta = Math.min(0.1, Math.max(0, seconds - lastSeconds));
      lastSeconds = seconds;
      if (renderer.domElement.parentNode.clientWidth && Math.abs(renderer.domElement.parentNode.clientWidth - width) > 1) resize();
      if (options.update) options.update(s, values, measurements, seconds, objects);
      // Framed after the first update, once the objects are where the experiment puts them.
      if (!framed) frameScene();
      updateFlows(delta);
      controls.update();
      renderer.render(scene, camera);

      overlayContext.clearRect(0, 0, width, height);
      const projected = [];
      labels.forEach((label) => {
        if (!label.visible || !label.target) return;
        const point = Array.isArray(label.target) ? toVector(label.target) : label.target.getWorldPosition(new Vector3());
        const screen = point.project(camera);
        if (screen.z > 1 || screen.z < -1) return;
        projected.push({
          text: label.text,
          ax: ((screen.x + 1) / 2) * width,
          ay: ((1 - screen.y) / 2) * height,
          color: label.color,
          priority: label.priority,
        });
      });
      drawLabels(overlayContext, projected, projectedObstacles(), width, height);
    },
  };
}
