'use client';

import { useEffect, useRef } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  RotateCcw,
} from 'lucide-react';
import * as THREE from 'three';
import type { RoomObjectItem } from '@/lib/game-content';

type AvatarRig = THREE.Group & {
  userData: {
    leftArm?: THREE.Mesh;
    rightArm?: THREE.Mesh;
    leftLeg?: THREE.Mesh;
    rightLeg?: THREE.Mesh;
  };
};
type SceneObjectMap = Map<string, THREE.Vector3>;

export function RoomExplorer3D({
  room,
  items,
  selectedId,
  onSelect,
}: {
  room: RoomObjectItem;
  items: RoomObjectItem[];
  selectedId?: string;
  onSelect: (item: RoomObjectItem) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<AvatarRig | null>(null);
  const yawRef = useRef(0.72);
  const pitchRef = useRef(0.62);
  const distanceRef = useRef(12.5);
  const selectedRef = useRef(selectedId);
  const itemsRef = useRef(items);
  const onSelectRef = useRef(onSelect);
  selectedRef.current = selectedId;
  itemsRef.current = items;
  onSelectRef.current = onSelect;
  const itemSignature = items.map((item) => item.id).join('|');

  function moveCharacter(forward: number, sideways: number) {
    const avatar = avatarRef.current;
    if (!avatar) return false;
    const yaw = yawRef.current;
    const dx = -Math.sin(yaw) * forward + Math.cos(yaw) * sideways;
    const dz = -Math.cos(yaw) * forward - Math.sin(yaw) * sideways;
    avatar.position.x = THREE.MathUtils.clamp(
      avatar.position.x + dx,
      -5.1,
      5.1,
    );
    avatar.position.z = THREE.MathUtils.clamp(
      avatar.position.z + dz,
      -4.1,
      4.1,
    );
    if (Math.abs(dx) + Math.abs(dz) > 0.001)
      avatar.rotation.y = Math.atan2(dx, dz);
    return true;
  }

  function resetView() {
    const avatar = avatarRef.current;
    if (!avatar) return;
    avatar.position.set(0, 0.08, 2.7);
    avatar.rotation.y = Math.PI;
    yawRef.current = 0.72;
    pitchRef.current = 0.62;
    distanceRef.current = 12.5;
  }

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#a7daf0');
    scene.fog = new THREE.Fog('#a7daf0', 23, 42);
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 60);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    host.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight('#fff9e8', '#5b7553', 2.6));
    const sun = new THREE.DirectionalLight('#fff1c2', 3.4);
    sun.position.set(-7, 12, 9);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    scene.add(sun);
    const objectPositions = buildDollhouse(scene, room.room_key);

    const avatar = createAvatar();
    avatar.position.set(0, 0.08, 2.7);
    avatar.rotation.y = Math.PI;
    avatarRef.current = avatar;
    scene.add(avatar);

    const markerMeshes: THREE.Mesh[] = [];
    itemsRef.current.forEach((item, index) => {
      const marker = new THREE.Mesh(
        new THREE.RingGeometry(0.18, 0.3, 28),
        new THREE.MeshBasicMaterial({
          color: '#d9ff59',
          transparent: true,
          opacity: 0.96,
          side: THREE.DoubleSide,
          depthTest: false,
        }),
      );
      const position =
        objectPositions.get(
          `${item.article} ${item.noun}`.toLocaleLowerCase('de'),
        ) ?? fallbackPosition(index);
      marker.position.copy(position);
      marker.rotation.x = -Math.PI / 2;
      marker.renderOrder = 8;
      marker.userData.item = item;
      scene.add(marker);
      markerMeshes.push(marker);
    });

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const keys = new Set<string>();
    let dragging = false;
    let moved = false;
    let lastX = 0;
    let lastY = 0;
    const resize = () => {
      const width = host.clientWidth;
      const height = Math.max(460, host.clientHeight);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const pointerDown = (event: PointerEvent) => {
      dragging = true;
      moved = false;
      lastX = event.clientX;
      lastY = event.clientY;
      renderer.domElement.setPointerCapture(event.pointerId);
    };
    const pointerMove = (event: PointerEvent) => {
      if (!dragging) return;
      const dx = event.clientX - lastX;
      const dy = event.clientY - lastY;
      if (Math.abs(dx) + Math.abs(dy) > 3) moved = true;
      yawRef.current -= dx * 0.004;
      pitchRef.current = THREE.MathUtils.clamp(
        pitchRef.current + dy * 0.003,
        0.3,
        0.95,
      );
      lastX = event.clientX;
      lastY = event.clientY;
    };
    const pointerUp = (event: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      if (moved) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(markerMeshes, false)[0];
      if (hit?.object.userData.item)
        onSelectRef.current(hit.object.userData.item);
    };
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      distanceRef.current = THREE.MathUtils.clamp(
        distanceRef.current + event.deltaY * 0.008,
        8,
        16,
      );
    };
    const keyDown = (event: KeyboardEvent) => {
      if (
        ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)
      )
        event.preventDefault();
      keys.add(event.key.toLowerCase());
    };
    const keyUp = (event: KeyboardEvent) =>
      keys.delete(event.key.toLowerCase());
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    renderer.domElement.addEventListener('pointerdown', pointerDown);
    renderer.domElement.addEventListener('pointermove', pointerMove);
    renderer.domElement.addEventListener('pointerup', pointerUp);
    renderer.domElement.addEventListener('wheel', wheel, { passive: false });
    window.addEventListener('keydown', keyDown);
    window.addEventListener('keyup', keyUp);
    resize();

    const target = new THREE.Vector3();
    const desiredCamera = new THREE.Vector3();
    let frame = 0;
    let previous = performance.now();
    let walkTime = 0;
    const animate = (now: number) => {
      const dt = Math.min((now - previous) / 1000, 0.05);
      previous = now;
      const forward =
        Number(keys.has('arrowup') || keys.has('w')) -
        Number(keys.has('arrowdown') || keys.has('s'));
      const sideways =
        Number(keys.has('arrowright') || keys.has('d')) -
        Number(keys.has('arrowleft') || keys.has('a'));
      const walking = forward !== 0 || sideways !== 0;
      if (walking) moveCharacter(forward * 3.1 * dt, sideways * 3.1 * dt);
      walkTime += walking ? dt * 9 : dt * 3;
      animateAvatar(avatar, walking ? Math.sin(walkTime) * 0.58 : 0);
      target.set(avatar.position.x, avatar.position.y + 1.2, avatar.position.z);
      const horizontal = Math.cos(pitchRef.current) * distanceRef.current;
      desiredCamera.set(
        target.x + Math.sin(yawRef.current) * horizontal,
        target.y + 1.2 + Math.sin(pitchRef.current) * distanceRef.current,
        target.z + Math.cos(yawRef.current) * horizontal,
      );
      camera.position.lerp(desiredCamera, 1 - Math.pow(0.001, dt));
      camera.lookAt(target);
      markerMeshes.forEach((marker, index) => {
        const active = marker.userData.item.id === selectedRef.current;
        (marker.material as THREE.MeshBasicMaterial).color.set(
          active ? '#ff416c' : '#d9ff59',
        );
        const pulse = 1 + Math.sin(now * 0.003 + index) * 0.1;
        marker.scale.setScalar(active ? 1.35 : pulse);
      });
      renderer.render(scene, camera);
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('keydown', keyDown);
      window.removeEventListener('keyup', keyUp);
      renderer.domElement.removeEventListener('pointerdown', pointerDown);
      renderer.domElement.removeEventListener('pointermove', pointerMove);
      renderer.domElement.removeEventListener('pointerup', pointerUp);
      renderer.domElement.removeEventListener('wheel', wheel);
      scene.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.geometry.dispose();
        if (Array.isArray(object.material))
          object.material.forEach((material) => material.dispose());
        else object.material.dispose();
      });
      renderer.dispose();
      renderer.domElement.remove();
      avatarRef.current = null;
    };
  }, [room.id, room.room_key, itemSignature]);

  return (
    <div className="relative overflow-hidden rounded-3xl border-4 border-white bg-sky-200 shadow-xl">
      <div ref={hostRef} className="h-[66vh] min-h-[500px] w-full touch-none" />
      <div className="pointer-events-none absolute left-4 top-4 rounded-2xl bg-black/60 px-4 py-3 text-xs font-semibold text-white backdrop-blur">
        <p>Explore the dollhouse · Drag to orbit the camera</p>
        <p className="mt-1 text-white/70">
          Arrows or WASD · Scroll to zoom · Click glowing objects
        </p>
      </div>
      <div className="absolute bottom-4 left-4 grid grid-cols-3 gap-1 rounded-2xl bg-black/60 p-2 backdrop-blur">
        <span />
        <Control label="Walk forward" onClick={() => moveCharacter(0.7, 0)}>
          <ArrowUp />
        </Control>
        <Control label="Reset character and camera" onClick={resetView}>
          <RotateCcw />
        </Control>
        <Control label="Walk left" onClick={() => moveCharacter(0, -0.7)}>
          <ArrowLeft />
        </Control>
        <Control label="Walk backward" onClick={() => moveCharacter(-0.7, 0)}>
          <ArrowDown />
        </Control>
        <Control label="Walk right" onClick={() => moveCharacter(0, 0.7)}>
          <ArrowRight />
        </Control>
      </div>
    </div>
  );
}

function buildDollhouse(scene: THREE.Scene, roomKey: string): SceneObjectMap {
  const positions = new Map<string, THREE.Vector3>();
  const mark = (names: string[], x: number, y: number, z: number) =>
    names.forEach((name) =>
      positions.set(name.toLocaleLowerCase('de'), new THREE.Vector3(x, y, z)),
    );
  const addBox = (
    size: [number, number, number],
    position: [number, number, number],
    color: string,
    roughness = 0.8,
  ) => {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(...size),
      new THREE.MeshStandardMaterial({ color, roughness }),
    );
    mesh.position.set(...position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    return mesh;
  };
  const addCylinder = (
    radius: number,
    height: number,
    position: [number, number, number],
    color: string,
  ) => {
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, height, 24),
      new THREE.MeshStandardMaterial({ color, roughness: 0.72 }),
    );
    mesh.position.set(...position);
    mesh.castShadow = true;
    scene.add(mesh);
    return mesh;
  };

  addBox([30, 0.15, 30], [0, -0.18, 0], '#75ab57');
  addBox(
    [12, 0.22, 10],
    [0, -0.02, 0],
    roomKey === 'kitchen' ? '#d9c9a5' : '#b77b50',
  );
  addBox([12, 3.9, 0.18], [0, 1.92, -5], '#f2eadc');
  addBox([0.18, 3.9, 10], [-6, 1.92, 0], '#f6efe5');
  addBox([12.5, 0.16, 0.32], [0, 3.95, -5], '#fffaf0');
  addBox([0.32, 0.16, 10.5], [-6, 3.95, 0], '#fffaf0');
  addBox([2.8, 0.08, 6.5], [7.6, 0, 0.6], '#d8c19e');

  if (roomKey === 'kitchen') {
    addBox([10, 0.9, 0.75], [0.5, 0.45, -4.25], '#8fbcad');
    addBox([10, 0.16, 0.95], [0.5, 0.98, -4.15], '#f1ede0');
    addBox([2, 3.2, 0.85], [-4.65, 1.6, -4.15], '#eaf0f2');
    addBox([1.5, 0.85, 0.88], [-2.3, 0.46, -4.15], '#353c42');
    addBox([1.35, 0.06, 0.7], [-2.3, 1.09, -4.05], '#15191d');
    addBox([1.6, 0.65, 0.65], [-2.3, 2.9, -4.45], '#84949a');
    addBox([1.8, 0.06, 0.62], [1.3, 1.08, -4.02], '#b9d7dc');
    addCylinder(0.06, 0.72, [1.8, 1.45, -4.15], '#d4dadd').rotation.z =
      Math.PI / 2;
    addBox([3.2, 0.18, 2], [0.2, 1.05, 0.6], '#d2a26f');
    for (const x of [-1, 1.4])
      for (const z of [-0.2, 1.4]) addCylinder(0.1, 1, [x, 0.5, z], '#805c3e');
    for (const x of [-1.8, 2.2])
      addBox([0.7, 1, 0.7], [x, 0.5, 0.6], '#df8b57');
    addCylinder(0.45, 0.18, [0.3, 1.24, 0.6], '#f4d25e');
    addBox([1.1, 0.07, 0.55], [-0.9, 1.19, 0.55], '#b67748');
    addBox([0.65, 0.65, 0.55], [3.55, 1.36, -4.05], '#d9dddf');
    addBox([0.62, 0.38, 0.5], [4.5, 1.23, -4.05], '#f4a261');
    for (let x = -4; x < 5; x += 0.75)
      addBox(
        [0.7, 0.7, 0.05],
        [x, 1.65, -4.88],
        x % 1.5 === 0 ? '#8fc7c5' : '#e7f1ed',
      );
    addCylinder(0.08, 0.55, [4.6, 1.32, 0.6], '#dac5a3');
    addCylinder(0.26, 0.33, [3.4, 1.18, -4.05], '#79a65c');
    addCylinder(0.22, 0.45, [4.35, 1.24, -4.05], '#dbe8f0');
    addCylinder(0.55, 0.12, [0.3, 1.22, 0.6], '#e8bb45');
    addCylinder(0.7, 0.18, [0.3, 3.2, 0.6], '#f3c969');
    mark(['der Kühlschrank'], -4.65, 2.4, -3.65);
    mark(['der Ofen'], -2.3, 1.3, -3.65);
    mark(['das Kochfeld'], -2.3, 1.25, -3.8);
    mark(['die Dunstabzugshaube'], -2.3, 3.25, -4.05);
    mark(['das Spülbecken'], 1.3, 1.2, -3.78);
    mark(['der Wasserhahn'], 1.8, 1.75, -3.9);
    mark(['die Arbeitsplatte'], 0.5, 1.2, -3.7);
    mark(['das Schneidebrett'], -0.9, 1.32, 0.55);
    mark(['die Obstschale', 'die Schale'], 0.3, 1.48, 0.6);
    mark(['der Tisch'], 0.2, 1.4, 0.6);
    mark(['der Stuhl'], -1.8, 1.25, 0.6);
    mark(['die Lampe'], 0.3, 3.45, 0.6);
    mark(['der Wasserkocher'], 3.55, 1.85, -4.05);
    mark(['der Toaster'], 4.5, 1.55, -4.05);
    mark(['die Tasse'], 1.15, 1.35, 0.3);
    mark(['der Teller'], 0.8, 1.31, 0.75);
    mark(['der Schrank'], 4.7, 0.75, -3.7);
    mark(['die Schublade'], 3.3, 0.65, -3.65);
    mark(['die Fliese'], 3.2, 1.9, -4.82);
    mark(['der Kochlöffel'], 4.6, 1.75, 0.6);
    mark(['der Kräutertopf'], 3.4, 1.58, -4.05);
    mark(['der Blumenstrauß', 'die Vase'], 4.35, 1.82, -4.05);
    mark(['das Fenster'], 3.8, 3, -4.82);
  } else {
    addBox([4.1, 1.1, 1.25], [0, 0.65, -3.75], '#ef8f84');
    addBox([3.5, 1.15, 0.28], [0, 1.35, -4.25], '#f5a69b');
    addBox([1.3, 1.15, 1.3], [-4.3, 0.64, -1.9], '#f3b467');
    addBox([2.8, 0.2, 1.45], [-0.2, 0.65, -0.8], '#d9a26d');
    addBox([4.2, 0.06, 3.1], [-0.2, 0.08, -0.8], '#75a8ad');
    addBox([3.1, 1.55, 0.75], [4.15, 0.78, -4.15], '#6d846f');
    addBox([2.4, 1.35, 0.18], [4.15, 2.3, -4.65], '#283742');
    addBox([1.8, 2.8, 0.55], [-4.85, 1.4, -4.42], '#a76d4d');
    for (let y = 0.45; y < 2.7; y += 0.5)
      addBox([1.55, 0.09, 0.7], [-4.85, y, -4.1], '#6e4937');
    addCylinder(0.14, 2.3, [-4.25, 1.15, 2.8], '#5a4a43');
    addCylinder(0.7, 0.55, [-4.25, 2.45, 2.8], '#f4d889');
    addCylinder(0.34, 0.7, [3.7, 0.35, -2.7], '#c86f59');
    const plant = addCylinder(0.65, 1.25, [3.7, 1.25, -2.7], '#4f9d58');
    plant.scale.set(1, 1.4, 1);
    addBox([2.5, 1.4, 0.08], [1.8, 2.65, -4.88], '#f2c14e');
    addCylinder(0.55, 0.18, [-0.2, 0.83, -0.8], '#eac766');
    addBox([0.8, 0.22, 0.65], [-1.2, 1.38, -3.2], '#fff1c9');
    addBox([1.2, 0.14, 0.8], [0.65, 1.4, -3.25], '#f7e1ba');
    addCylinder(0.42, 0.45, [2.8, 0.22, -3.55], '#cf7b53');
    addBox([1.4, 0.72, 0.85], [2.7, 0.36, 1.95], '#b98256');
    mark(['das Sofa'], 0, 1.65, -3.15);
    mark(['der Sessel'], -4.3, 1.55, -1.9);
    mark(['die Lampe'], -4.25, 2.85, 2.8);
    mark(['der Fernseher'], 4.15, 2.75, -4.4);
    mark(['das Bücherregal'], -4.85, 2.9, -3.8);
    mark(['der Tisch'], -0.2, 1, -0.8);
    mark(['der Teppich'], -0.2, 0.2, -0.8);
    mark(['das Fenster'], 1.8, 3.15, -4.8);
    mark(['die Uhr'], -1.7, 3.05, -4.82);
    mark(['der Vorhang'], 0.5, 2.8, -4.72);
    mark(['das Kissen'], -1.2, 1.75, -3.15);
    mark(['die Decke'], 0.65, 1.72, -3.18);
    mark(['das Gemälde'], 1.8, 3.35, -4.75);
    mark(['die Zimmerpflanze'], 3.7, 2.25, -2.7);
    mark(['der Blumentopf'], 3.7, 0.95, -2.7);
    mark(['der Korb'], 2.8, 0.7, -3.55);
    mark(['die Schale'], -0.2, 1.1, -0.8);
    mark(['das Sideboard'], 4.15, 1.75, -4.05);
  }
  return positions;
}

function fallbackPosition(index: number) {
  const column = index % 5;
  const row = Math.floor(index / 5) % 3;
  return new THREE.Vector3(-4 + column * 2, 0.25, -3 + row * 2.4);
}

function createAvatar() {
  const avatar = new THREE.Group() as AvatarRig;
  const material = (color: string) =>
    new THREE.MeshStandardMaterial({ color, roughness: 0.72 });
  const skin = material('#dca47d');
  const shirt = material('#6b5cff');
  const trousers = material('#28364c');
  const torso = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.36, 0.72, 7, 14),
    shirt,
  );
  torso.position.y = 1.32;
  torso.castShadow = true;
  avatar.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.34, 24, 18), skin);
  head.position.y = 2.18;
  head.castShadow = true;
  avatar.add(head);
  const hair = new THREE.Mesh(
    new THREE.SphereGeometry(0.355, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.52),
    material('#493326'),
  );
  hair.position.y = 2.23;
  hair.castShadow = true;
  avatar.add(hair);
  const limbGeometry = new THREE.CapsuleGeometry(0.11, 0.62, 5, 10);
  const leftArm = new THREE.Mesh(limbGeometry, skin);
  const rightArm = new THREE.Mesh(limbGeometry, skin);
  leftArm.position.set(-0.48, 1.28, 0);
  rightArm.position.set(0.48, 1.28, 0);
  avatar.add(leftArm, rightArm);
  const legGeometry = new THREE.CapsuleGeometry(0.14, 0.7, 5, 10);
  const leftLeg = new THREE.Mesh(legGeometry, trousers);
  const rightLeg = new THREE.Mesh(legGeometry, trousers);
  leftLeg.position.set(-0.19, 0.38, 0);
  rightLeg.position.set(0.19, 0.38, 0);
  avatar.add(leftLeg, rightLeg);
  for (const x of [-0.19, 0.19]) {
    const shoe = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.16, 0.46),
      material('#f3efe7'),
    );
    shoe.position.set(x, -0.05, -0.08);
    avatar.add(shoe);
  }
  avatar.userData.leftArm = leftArm;
  avatar.userData.rightArm = rightArm;
  avatar.userData.leftLeg = leftLeg;
  avatar.userData.rightLeg = rightLeg;
  return avatar;
}

function animateAvatar(avatar: AvatarRig, swing: number) {
  if (avatar.userData.leftArm) avatar.userData.leftArm.rotation.x = swing;
  if (avatar.userData.rightArm) avatar.userData.rightArm.rotation.x = -swing;
  if (avatar.userData.leftLeg) avatar.userData.leftLeg.rotation.x = -swing;
  if (avatar.userData.rightLeg) avatar.userData.rightLeg.rotation.x = swing;
}

function Control({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="grid size-10 place-items-center rounded-xl border border-white/20 bg-white/15 text-white transition hover:bg-white/30"
    >
      {children}
    </button>
  );
}
