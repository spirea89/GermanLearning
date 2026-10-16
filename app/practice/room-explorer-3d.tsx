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
import { createHouseObjectModel } from '@/lib/house-3d-models';

type AvatarRig = THREE.Group & {
  userData: {
    leftArm?: THREE.Mesh;
    rightArm?: THREE.Mesh;
    leftLeg?: THREE.Mesh;
    rightLeg?: THREE.Mesh;
  };
};
type SceneObjectMap = Map<string, THREE.Vector3>;
type DollhouseBuild = {
  positions: SceneObjectMap;
  movableModels: Map<string, THREE.Group>;
};

export function RoomExplorer3D({
  room,
  items,
  selectedId,
  onSelect,
  nextRoomTitle,
  onEnterRoom,
  onPlaceObject,
}: {
  room: RoomObjectItem;
  items: RoomObjectItem[];
  selectedId?: string;
  onSelect: (item: RoomObjectItem) => void;
  nextRoomTitle?: string;
  onEnterRoom?: () => void;
  onPlaceObject?: (item: RoomObjectItem, x: number, z: number) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<AvatarRig | null>(null);
  const yawRef = useRef(0.72);
  const pitchRef = useRef(1.02);
  const distanceRef = useRef(14.5);
  const selectedRef = useRef(selectedId);
  const itemsRef = useRef(items);
  const onSelectRef = useRef(onSelect);
  const onEnterRoomRef = useRef(onEnterRoom);
  const onPlaceObjectRef = useRef(onPlaceObject);
  const transitioningRef = useRef(false);
  selectedRef.current = selectedId;
  itemsRef.current = items;
  onSelectRef.current = onSelect;
  onEnterRoomRef.current = onEnterRoom;
  onPlaceObjectRef.current = onPlaceObject;
  const itemSignature = items
    .map((item) => `${item.id}:${item.hotspot_x}:${item.hotspot_y}`)
    .join('|');

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
    if (
      avatar.position.x > 4.65 &&
      avatar.position.z > 1.15 &&
      !transitioningRef.current &&
      onEnterRoomRef.current
    ) {
      transitioningRef.current = true;
      onEnterRoomRef.current();
    }
    return true;
  }

  function resetView() {
    const avatar = avatarRef.current;
    if (!avatar) return;
    avatar.position.set(0, 0.08, 2.7);
    avatar.rotation.y = Math.PI;
    yawRef.current = 0.72;
    pitchRef.current = 1.02;
    distanceRef.current = 14.5;
  }

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const scene = new THREE.Scene();
    transitioningRef.current = false;
    scene.background = new THREE.Color('#a7daf0');
    scene.fog = new THREE.Fog('#a7daf0', 23, 42);
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 60);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    host.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight('#fff9e8', '#5b7553', 2.6));
    const sun = new THREE.DirectionalLight('#fff1c2', 3.4);
    sun.position.set(-7, 12, 9);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    scene.add(sun);
    const { positions: objectPositions, movableModels } = buildDollhouse(
      scene,
      room.room_key,
      itemsRef.current,
    );

    const avatar = createAvatar();
    avatar.position.set(0, 0.08, 2.7);
    avatar.rotation.y = Math.PI;
    avatarRef.current = avatar;
    scene.add(avatar);

    const markerMeshes: THREE.Mesh[] = [];
    const objectHitMeshes: THREE.Mesh[] = [];
    itemsRef.current.forEach((item, index) => {
      if (Number(item.hotspot_x) < 0 || Number(item.hotspot_y) < 0) return;
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
      const movableModel = movableModels.get(item.id);
      marker.position.copy(position);
      marker.rotation.x = -Math.PI / 2;
      marker.renderOrder = 8;
      marker.userData.item = item;
      marker.userData.movableModel = movableModel;
      marker.userData.hitPixels = THREE.MathUtils.clamp(
        46 + Math.max(Number(item.hotspot_width), Number(item.hotspot_height)),
        62,
        115,
      );
      scene.add(marker);
      markerMeshes.push(marker);

      const hitRadius = THREE.MathUtils.clamp(
        Math.max(Number(item.hotspot_width), Number(item.hotspot_height)) / 16,
        0.7,
        2.35,
      );
      const objectHitArea = new THREE.Mesh(
        new THREE.SphereGeometry(hitRadius, 12, 8),
        new THREE.MeshBasicMaterial({
          transparent: true,
          opacity: 0,
          depthWrite: false,
        }),
      );
      objectHitArea.position.copy(position);
      objectHitArea.userData.item = item;
      objectHitArea.userData.movableModel = movableModel;
      objectHitArea.userData.marker = marker;
      scene.add(objectHitArea);
      objectHitMeshes.push(objectHitArea);
    });

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const keys = new Set<string>();
    const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    let dragging = false;
    let moved = false;
    let draggedObject: {
      item: RoomObjectItem;
      model: THREE.Group;
      marker: THREE.Mesh;
      hitArea: THREE.Mesh;
    } | null = null;
    let lastX = 0;
    let lastY = 0;
    const setPointer = (event: { clientX: number; clientY: number }) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1,
      );
    };
    const resize = () => {
      const width = host.clientWidth;
      const height = Math.max(460, host.clientHeight);
      renderer.setSize(width, height, true);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const pointerDown = (event: PointerEvent) => {
      dragging = true;
      moved = false;
      lastX = event.clientX;
      lastY = event.clientY;
      renderer.domElement.setPointerCapture(event.pointerId);
      if (onPlaceObjectRef.current) {
        setPointer(event);
        raycaster.setFromCamera(pointer, camera);
        const hit = raycaster.intersectObjects(objectHitMeshes, false)[0];
        const model = hit?.object.userData.movableModel as
          | THREE.Group
          | undefined;
        const marker = hit?.object.userData.marker as THREE.Mesh | undefined;
        const item = hit?.object.userData.item as RoomObjectItem | undefined;
        if (model && marker && item)
          draggedObject = {
            item,
            model,
            marker,
            hitArea: hit.object as THREE.Mesh,
          };
      }
    };
    const pointerMove = (event: PointerEvent) => {
      if (!dragging) return;
      const dx = event.clientX - lastX;
      const dy = event.clientY - lastY;
      if (Math.abs(dx) + Math.abs(dy) > 3) moved = true;
      if (draggedObject) {
        setPointer(event);
        raycaster.setFromCamera(pointer, camera);
        const point = new THREE.Vector3();
        if (raycaster.ray.intersectPlane(floorPlane, point)) {
          const x = THREE.MathUtils.clamp(point.x, -4.58, 4.58);
          const z = THREE.MathUtils.clamp(point.z, -3.44, 3.44);
          draggedObject.model.position.x = x;
          draggedObject.model.position.z = z;
          draggedObject.marker.position.x = x;
          draggedObject.marker.position.z = z;
          draggedObject.hitArea.position.x = x;
          draggedObject.hitArea.position.z = z;
        }
        lastX = event.clientX;
        lastY = event.clientY;
        return;
      }
      yawRef.current -= dx * 0.004;
      pitchRef.current = THREE.MathUtils.clamp(
        pitchRef.current + dy * 0.003,
        0.5,
        1.32,
      );
      lastX = event.clientX;
      lastY = event.clientY;
    };
    const pointerUp = (event: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      if (draggedObject) {
        const current = draggedObject;
        draggedObject = null;
        if (moved && onPlaceObjectRef.current) {
          const x = THREE.MathUtils.clamp(
            (current.model.position.x / 10.4 + 0.5) * 100,
            6,
            94,
          );
          const z = THREE.MathUtils.clamp(
            (current.model.position.z / 8.2 + 0.5) * 100,
            8,
            92,
          );
          onPlaceObjectRef.current(current.item, x, z);
        } else {
          onSelectRef.current(current.item);
        }
        return;
      }
      if (moved) return;
      const rect = renderer.domElement.getBoundingClientRect();
      setPointer(event);
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(
        [...objectHitMeshes, ...markerMeshes],
        false,
      )[0];
      if (hit?.object.userData.item) {
        onSelectRef.current(hit.object.userData.item);
        return;
      }

      // Screen-space fallback makes small and thin objects easy to select on touch.
      const clickX = event.clientX - rect.left;
      const clickY = event.clientY - rect.top;
      let closest: { marker: THREE.Mesh; distance: number } | null = null;
      markerMeshes.forEach((marker) => {
        const projected = marker.position.clone().project(camera);
        if (projected.z < -1 || projected.z > 1) return;
        const markerX = ((projected.x + 1) / 2) * rect.width;
        const markerY = ((1 - projected.y) / 2) * rect.height;
        const distance = Math.hypot(clickX - markerX, clickY - markerY);
        if (
          distance <= marker.userData.hitPixels &&
          (!closest || distance < closest.distance)
        )
          closest = { marker, distance };
      });
      if (closest)
        onSelectRef.current(
          (closest as { marker: THREE.Mesh }).marker.userData.item,
        );
    };
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      distanceRef.current = THREE.MathUtils.clamp(
        distanceRef.current + event.deltaY * 0.008,
        9,
        18,
      );
    };
    const dragOver = (event: DragEvent) => {
      if (!onPlaceObjectRef.current) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    };
    const drop = (event: DragEvent) => {
      event.preventDefault();
      const itemId = event.dataTransfer?.getData('text/plain');
      const item = itemsRef.current.find((entry) => entry.id === itemId);
      if (!item || !onPlaceObjectRef.current) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(pointer, camera);
      const point = new THREE.Vector3();
      if (!raycaster.ray.intersectPlane(floorPlane, point)) return;
      const x = THREE.MathUtils.clamp((point.x / 10.4 + 0.5) * 100, 6, 94);
      const z = THREE.MathUtils.clamp((point.z / 8.2 + 0.5) * 100, 8, 92);
      onPlaceObjectRef.current(item, x, z);
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
    renderer.domElement.addEventListener('dragover', dragOver);
    renderer.domElement.addEventListener('drop', drop);
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
      renderer.domElement.removeEventListener('dragover', dragOver);
      renderer.domElement.removeEventListener('drop', drop);
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          if (Array.isArray(object.material))
            object.material.forEach((material) => material.dispose());
          else object.material.dispose();
        } else if (object instanceof THREE.Sprite) {
          object.material.map?.dispose();
          object.material.dispose();
        }
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
          Arrows or WASD · Click for details · Drag furniture to move it
        </p>
      </div>
      {nextRoomTitle ? (
        <div className="pointer-events-none absolute right-4 top-4 rounded-2xl border border-white/30 bg-[#2d6a4f]/90 px-4 py-3 text-right text-xs font-bold text-white shadow-lg backdrop-blur">
          <p className="uppercase tracking-[.14em] text-white/70">Doorway</p>
          <p className="mt-1 text-sm">Walk through to {nextRoomTitle} →</p>
        </div>
      ) : null}
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

function buildDollhouse(
  scene: THREE.Scene,
  roomKey: string,
  roomItems: RoomObjectItem[],
): DollhouseBuild {
  const positions = new Map<string, THREE.Vector3>();
  const movableModels = new Map<string, THREE.Group>();
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
  const addSphere = (
    radius: number,
    position: [number, number, number],
    color: string,
    scale: [number, number, number] = [1, 1, 1],
  ) => {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 20, 14),
      new THREE.MeshStandardMaterial({ color, roughness: 0.72 }),
    );
    mesh.position.set(...position);
    mesh.scale.set(...scale);
    mesh.castShadow = true;
    scene.add(mesh);
    return mesh;
  };
  const addTorus = (
    radius: number,
    tube: number,
    position: [number, number, number],
    color: string,
  ) => {
    const mesh = new THREE.Mesh(
      new THREE.TorusGeometry(radius, tube, 12, 28),
      new THREE.MeshStandardMaterial({ color, roughness: 0.55 }),
    );
    mesh.position.set(...position);
    mesh.castShadow = true;
    scene.add(mesh);
    return mesh;
  };
  const addChair = (x: number, z: number, rotation = 0) => {
    const chair = new THREE.Group();
    const chairBox = (
      size: [number, number, number],
      position: [number, number, number],
      color: string,
    ) => {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(...size),
        new THREE.MeshStandardMaterial({ color, roughness: 0.78 }),
      );
      mesh.position.set(...position);
      mesh.castShadow = true;
      chair.add(mesh);
    };
    chairBox([0.82, 0.16, 0.82], [0, 0.82, 0], '#d88955');
    chairBox([0.72, 0.12, 0.72], [0, 0.94, 0], '#46636b');
    chairBox([0.82, 1.05, 0.14], [0, 1.42, 0.34], '#c97749');
    for (const px of [-0.32, 0.32])
      for (const pz of [-0.32, 0.32])
        chairBox([0.1, 0.8, 0.1], [px, 0.4, pz], '#7b4e34');
    chair.position.set(x, 0, z);
    chair.rotation.y = rotation;
    scene.add(chair);
  };
  const addWindow = (x: number, y: number, width: number) => {
    addBox([width, 1.55, 0.06], [x, y, -4.87], '#9dd9ee', 0.18);
    addBox([width + 0.16, 0.1, 0.12], [x, y + 0.82, -4.81], '#ffffff');
    addBox([width + 0.16, 0.1, 0.12], [x, y - 0.82, -4.81], '#ffffff');
    addBox([0.1, 1.7, 0.12], [x - width / 2, y, -4.81], '#ffffff');
    addBox([0.1, 1.7, 0.12], [x + width / 2, y, -4.81], '#ffffff');
    addBox([0.08, 1.55, 0.1], [x, y, -4.78], '#ffffff');
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

  // Shared doorway: crossing this threshold loads the next connected room.
  addBox([0.28, 3, 0.28], [5.45, 1.5, 1.35], '#6f432c');
  addBox([0.28, 3, 0.28], [5.45, 1.5, 3.85], '#6f432c');
  addBox([0.3, 0.3, 2.8], [5.45, 3, 2.6], '#6f432c');
  const openDoor = addBox([0.16, 2.65, 1.95], [5.05, 1.38, 3.62], '#b87949');
  openDoor.rotation.y = -0.72;
  addSphere(0.08, [4.43, 1.45, 3.08], '#f2c14e');
  addBox([1.2, 0.035, 1.65], [4.75, 0.12, 2.6], '#68d391', 0.35);
  const doorwayBeacon = new THREE.Mesh(
    new THREE.ConeGeometry(0.28, 0.55, 4),
    new THREE.MeshStandardMaterial({
      color: '#d9ff59',
      emissive: '#89bd21',
      emissiveIntensity: 0.8,
    }),
  );
  doorwayBeacon.position.set(4.85, 3.45, 2.6);
  doorwayBeacon.rotation.z = Math.PI;
  scene.add(doorwayBeacon);

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
    // Appliance doors, controls and handles make the kitchen objects legible.
    addBox([1.82, 0.05, 0.05], [-4.65, 1.55, -3.7], '#9caeb2');
    addBox([0.08, 0.75, 0.08], [-3.95, 2.15, -3.66], '#738287');
    addBox([1.12, 0.48, 0.05], [-2.3, 0.48, -3.68], '#11191e', 0.25);
    for (const x of [-2.65, -2.3, -1.95])
      addCylinder(0.08, 0.07, [x, 0.88, -3.66], '#d8dfe0').rotation.x =
        Math.PI / 2;
    for (const x of [-2.65, -1.95])
      for (const z of [-4.25, -3.9])
        addTorus(0.13, 0.025, [x, 1.14, z], '#444b50').rotation.x = Math.PI / 2;
    addBox([1.45, 0.35, 0.45], [1.3, 1.01, -4.02], '#8fc7d0');
    const faucet = addTorus(0.3, 0.05, [1.63, 1.43, -4.02], '#d5dcde');
    faucet.rotation.y = Math.PI / 2;
    for (const x of [-0.2, 1.55, 3.3, 4.85]) {
      addBox([1.45, 1.05, 0.58], [x, 2.55, -4.5], '#f3eee2');
      addCylinder(0.035, 0.34, [x + 0.52, 2.55, -4.16], '#98765d').rotation.z =
        Math.PI / 2;
    }
    addWindow(3.95, 2.75, 1.7);
    addChair(-1.8, 0.6, Math.PI / 2);
    addChair(2.2, 0.6, -Math.PI / 2);
    const kettleBody = addSphere(
      0.33,
      [3.55, 1.45, -4.04],
      '#dde5e6',
      [1, 1.15, 0.9],
    );
    kettleBody.rotation.y = -0.2;
    addTorus(0.32, 0.045, [3.55, 1.56, -4.02], '#596a70').rotation.y =
      Math.PI / 2;
    addBox([0.18, 0.12, 0.38], [3.83, 1.55, -4.02], '#c9d3d5');
    addBox([0.46, 0.08, 0.28], [4.5, 1.47, -4.03], '#3b4145');
    addBox([0.46, 0.08, 0.04], [4.5, 1.58, -3.76], '#494f52');
    const cup = addCylinder(0.16, 0.3, [1.15, 1.28, 0.3], '#f7f0e0');
    cup.rotation.x = 0;
    addTorus(0.13, 0.035, [1.31, 1.31, 0.3], '#f7f0e0').rotation.y =
      Math.PI / 2;
    addCylinder(0.3, 0.035, [0.8, 1.18, 0.75], '#f9faf8');
    for (const [x, z, color] of [
      [0.15, 0.55, '#e94f37'],
      [0.42, 0.62, '#f7b32b'],
      [0.25, 0.82, '#74a44b'],
    ] as const)
      addSphere(0.14, [x, 1.42, z], color);
    for (let x = -3.9; x < 5.2; x += 1.5)
      addBox([0.04, 0.3, 0.04], [x, 0.45, -3.82], '#d9e2dc');
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
  } else if (roomKey === 'living_room') {
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
    // Upholstery, legs and accessories turn the simple silhouettes into furniture.
    for (const x of [-1.45, 1.45]) {
      addBox([0.42, 1.05, 1.38], [x, 0.82, -3.72], '#d86f68');
      addBox([0.16, 0.42, 0.16], [x, 0.2, -3.45], '#684838');
    }
    for (const x of [-0.95, 0, 0.95])
      addBox([0.82, 0.2, 0.82], [x, 1.17, -3.55], '#f3a29a');
    addBox([0.78, 0.18, 0.8], [-4.3, 1.13, -1.85], '#f9cf91');
    addBox([0.95, 1.05, 0.22], [-4.3, 1.35, -2.35], '#dd9552');
    for (const x of [-4.68, -3.92])
      addBox([0.18, 0.65, 1.15], [x, 0.85, -1.95], '#e8a65c');
    for (const x of [-1.25, 0.85])
      for (const z of [-1.3, -0.3])
        addCylinder(0.09, 0.62, [x, 0.32, z], '#77513a');
    addBox([2.24, 1.18, 0.08], [4.15, 2.3, -4.53], '#152530', 0.18);
    addBox([0.18, 0.5, 0.18], [4.15, 1.55, -4.3], '#303b40');
    addBox([1.05, 0.08, 0.5], [4.15, 1.32, -4.28], '#303b40');
    const bookColors = ['#ef6f6c', '#f2c14e', '#5ca4a9', '#7c6bb1', '#86b95b'];
    for (let shelf = 0; shelf < 4; shelf++)
      for (let book = 0; book < 5; book++)
        addBox(
          [0.18, 0.34 + (book % 2) * 0.08, 0.34],
          [-5.45 + book * 0.27, 0.48 + shelf * 0.5, -4.02],
          bookColors[(shelf + book) % bookColors.length],
        );
    addWindow(-2.25, 2.7, 1.8);
    addBox([0.62, 2.5, 0.08], [-3.42, 2.45, -4.72], '#d9b7e8');
    addBox([0.62, 2.5, 0.08], [-1.08, 2.45, -4.72], '#d9b7e8');
    const clockFace = addCylinder(0.42, 0.09, [-0.7, 3.1, -4.76], '#fbfaf5');
    clockFace.rotation.x = Math.PI / 2;
    const hourHand = addBox([0.05, 0.34, 0.04], [-0.7, 3.23, -4.68], '#263238');
    hourHand.rotation.z = -0.4;
    const minuteHand = addBox(
      [0.05, 0.42, 0.04],
      [-0.53, 3.1, -4.67],
      '#263238',
    );
    minuteHand.rotation.z = Math.PI / 2;
    addBox([2.2, 1.15, 0.08], [1.8, 2.7, -4.72], '#a56a43');
    addBox([1.9, 0.85, 0.06], [1.8, 2.7, -4.66], '#5d9c8b');
    for (const [x, y, scale] of [
      [3.7, 1.25, 0.55],
      [3.38, 1.6, 0.42],
      [4.02, 1.65, 0.48],
      [3.65, 1.95, 0.44],
    ] as const)
      addSphere(scale, [x, y, -2.7], '#4f9d58', [1.25, 0.65, 0.8]);
    addTorus(0.38, 0.07, [2.8, 0.58, -3.55], '#a96e42').rotation.x =
      Math.PI / 2;
    addCylinder(0.42, 0.08, [-0.2, 0.83, -0.8], '#dba833');
    for (const x of [3.45, 4.15, 4.85]) {
      addBox([0.58, 1.05, 0.06], [x, 0.82, -3.74], '#596f5e');
      addSphere(0.045, [x + 0.2, 0.82, -3.68], '#d7bd74');
    }
    for (const x of [2.2, 3.2])
      for (const z of [1.65, 2.25])
        addBox([0.1, 0.7, 0.1], [x, 0.35, z], '#73513a');
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
  } else {
    const palette = ['#e07a5f', '#81b29a', '#f2cc8f', '#6d8dad', '#a98bc2'];
    const largeNouns = new Set([
      'Sofa',
      'Bett',
      'Badewanne',
      'Auto',
      'Esstisch',
      'Schreibtisch',
      'Kleiderschrank',
      'Waschmaschine',
      'Trockner',
      'Werkbank',
    ]);
    const plantNouns = new Set(['Pflanze', 'Baum', 'Blume', 'Blumentopf']);
    roomItems.forEach((item, index) => {
      if (Number(item.hotspot_x) < 0 || Number(item.hotspot_y) < 0) return;
      const x = (Number(item.hotspot_x) / 100 - 0.5) * 10.4;
      const z = (Number(item.hotspot_y) / 100 - 0.5) * 8.2;
      const color = palette[index % palette.length];
      const model = createHouseObjectModel(item.inventory_id ?? 'box');
      model.group.position.set(x, 0.02, z);
      scene.add(model.group);
      movableModels.set(item.id, model.group);
      mark(
        [`${item.article} ${item.noun}`],
        x,
        Math.max(0.45, model.height + 0.2),
        z,
      );
      return;
      if (plantNouns.has(item.noun)) {
        addCylinder(0.3, 0.55, [x, 0.28, z], '#b66f43');
        addCylinder(0.08, 0.9, [x, 0.95, z], '#567d46');
        addSphere(0.55, [x, 1.45, z], '#62a85b', [1.1, 0.8, 1]);
      } else if (item.noun === 'Lampe') {
        addCylinder(0.08, 1.6, [x, 0.8, z], '#5f554d');
        addCylinder(0.48, 0.55, [x, 1.85, z], '#f3d58a');
      } else if (
        item.noun === 'Stuhl' ||
        item.noun === 'Bürostuhl' ||
        item.noun === 'Gartenstuhl'
      ) {
        addChair(x, z);
      } else if (item.noun === 'Bett') {
        addBox([2.2, 0.42, 1.5], [x, 0.38, z], '#a96f4c');
        addBox([2.05, 0.28, 1.35], [x, 0.72, z], '#edf0e8');
        addBox([0.65, 0.18, 0.52], [x - 0.58, 0.94, z - 0.28], '#f7d6c8');
        addBox([0.16, 1.15, 1.55], [x - 1.08, 0.68, z], '#81533d');
      } else if (item.noun === 'Auto') {
        addBox([2.25, 0.58, 1.15], [x, 0.55, z], '#d84f4b', 0.35);
        addBox([1.2, 0.48, 0.96], [x - 0.15, 1.02, z], '#8ec4d8', 0.2);
        for (const wheelX of [-0.72, 0.72])
          for (const wheelZ of [-0.6, 0.6]) {
            const wheel = addCylinder(
              0.25,
              0.16,
              [x + wheelX, 0.32, z + wheelZ],
              '#24282b',
            );
            wheel.rotation.x = Math.PI / 2;
          }
      } else if (item.noun === 'Fahrrad') {
        for (const wheelX of [-0.62, 0.62]) {
          const wheel = addTorus(0.42, 0.055, [x + wheelX, 0.52, z], '#30363b');
          wheel.rotation.y = Math.PI / 2;
        }
        const frame = addBox([1.05, 0.08, 0.08], [x, 0.62, z], '#e67b42');
        frame.rotation.z = -0.35;
        addCylinder(0.04, 0.75, [x + 0.35, 0.86, z], '#e67b42').rotation.z =
          -0.45;
      } else if (item.noun === 'Badewanne' || item.noun === 'Dusche') {
        addBox([2, 0.68, 1.15], [x, 0.42, z], '#e9f1f2');
        addBox([1.6, 0.18, 0.78], [x, 0.72, z], '#99d2df', 0.3);
        addTorus(0.25, 0.045, [x + 0.7, 1.08, z], '#c9d3d5').rotation.y =
          Math.PI / 2;
      } else if (item.noun === 'Toilette') {
        addCylinder(0.44, 0.48, [x, 0.34, z], '#f3f5f2');
        addTorus(0.36, 0.1, [x, 0.65, z], '#f3f5f2').rotation.x = Math.PI / 2;
        addBox([0.78, 0.8, 0.38], [x, 0.72, z - 0.45], '#f3f5f2');
      } else if (
        ['Esstisch', 'Schreibtisch', 'Couchtisch', 'Werkbank'].includes(
          item.noun,
        )
      ) {
        addBox([2, 0.2, 1.1], [x, 0.85, z], color);
        for (const legX of [-0.78, 0.78])
          for (const legZ of [-0.38, 0.38])
            addBox([0.12, 0.8, 0.12], [x + legX, 0.4, z + legZ], '#684938');
      } else if (
        [
          'Kühlschrank',
          'Waschmaschine',
          'Trockner',
          'Spülmaschine',
          'Ofen',
          'Mikrowelle',
        ].includes(item.noun)
      ) {
        addBox([1.2, 1.55, 1], [x, 0.78, z], '#e7eceb', 0.35);
        addBox([0.86, 0.7, 0.06], [x, 0.72, z + 0.51], '#283a42', 0.18);
        addCylinder(
          0.08,
          0.08,
          [x + 0.4, 1.3, z + 0.54],
          '#65a9b9',
        ).rotation.x = Math.PI / 2;
      } else if (largeNouns.has(item.noun)) {
        addBox([2, 0.85, 1.25], [x, 0.45, z], color);
        addBox(
          [1.75, 0.5, 0.18],
          [x, 1.08, z - 0.5],
          palette[(index + 1) % palette.length],
        );
        for (const legX of [-0.72, 0.72])
          addBox([0.12, 0.35, 0.12], [x + legX, 0.18, z + 0.42], '#624735');
      } else {
        addBox([1.15, 1.15, 0.95], [x, 0.58, z], color);
        addBox([0.72, 0.1, 0.06], [x, 0.75, z + 0.49], '#f8f4e8');
        addSphere(0.08, [x + 0.38, 0.58, z + 0.5], '#f2d36b');
      }
      mark(
        [`${item.article} ${item.noun}`],
        x,
        largeNouns.has(item.noun) ? 1.35 : 1.55,
        z,
      );
    });
  }
  return { positions, movableModels };
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
