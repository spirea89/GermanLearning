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
  const yawRef = useRef(0);
  const pitchRef = useRef(0.2);
  const distanceRef = useRef(6.4);
  const selectedRef = useRef(selectedId);
  selectedRef.current = selectedId;

  function moveCharacter(forward: number, sideways: number) {
    const avatar = avatarRef.current;
    if (!avatar) return false;
    const yaw = yawRef.current;
    const dx = -Math.sin(yaw) * forward + Math.cos(yaw) * sideways;
    const dz = -Math.cos(yaw) * forward - Math.sin(yaw) * sideways;
    avatar.position.x = THREE.MathUtils.clamp(
      avatar.position.x + dx,
      -5.7,
      5.7,
    );
    avatar.position.z = THREE.MathUtils.clamp(
      avatar.position.z + dz,
      -5.2,
      3.2,
    );
    if (Math.abs(dx) + Math.abs(dz) > 0.001)
      avatar.rotation.y = Math.atan2(dx, dz);
    return true;
  }

  function resetView() {
    const avatar = avatarRef.current;
    if (!avatar) return;
    avatar.position.set(0, -4.42, 1.8);
    avatar.rotation.y = Math.PI;
    yawRef.current = 0;
    pitchRef.current = 0.2;
    distanceRef.current = 6.4;
  }

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#171d1a');
    scene.fog = new THREE.Fog('#171d1a', 16, 30);

    const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 60);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    host.appendChild(renderer.domElement);

    const roomWidth = 16;
    const roomHeight = 9;
    const roomDepth = 15;
    const floorY = -roomHeight / 2;
    const texture = new THREE.TextureLoader().load(room.image_url);
    texture.colorSpace = THREE.SRGBColorSpace;
    const backWall = new THREE.Mesh(
      new THREE.PlaneGeometry(roomWidth, roomHeight),
      new THREE.MeshBasicMaterial({ map: texture }),
    );
    backWall.position.set(0, 0, -8);
    scene.add(backWall);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(roomWidth, roomDepth),
      new THREE.MeshStandardMaterial({ color: '#846b54', roughness: 0.76 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, floorY, -0.5);
    floor.receiveShadow = true;
    scene.add(floor);
    const grid = new THREE.GridHelper(roomWidth, 16, '#bda890', '#927760');
    grid.position.set(0, floorY + 0.012, -0.5);
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.22;
    scene.add(grid);

    const ceiling = new THREE.Mesh(
      new THREE.PlaneGeometry(roomWidth, roomDepth),
      new THREE.MeshStandardMaterial({ color: '#dedbd2', roughness: 1 }),
    );
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(0, roomHeight / 2, -0.5);
    scene.add(ceiling);
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: '#aaaea8',
      roughness: 0.95,
      side: THREE.DoubleSide,
    });
    for (const side of [-1, 1]) {
      const wall = new THREE.Mesh(
        new THREE.PlaneGeometry(roomDepth, roomHeight),
        wallMaterial,
      );
      wall.rotation.y = (side * Math.PI) / 2;
      wall.position.set((side * roomWidth) / 2, 0, -0.5);
      scene.add(wall);
    }
    scene.add(new THREE.HemisphereLight('#fff8e8', '#51463c', 2.4));
    const keyLight = new THREE.DirectionalLight('#fff1d0', 2.2);
    keyLight.position.set(-3, 7, 5);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const avatar = createAvatar();
    avatar.position.set(0, floorY + 0.08, 1.8);
    avatar.rotation.y = Math.PI;
    avatarRef.current = avatar;
    scene.add(avatar);

    const markerMeshes: THREE.Mesh[] = [];
    items.forEach((item) => {
      const radius = THREE.MathUtils.clamp(
        Math.max(Number(item.hotspot_width), Number(item.hotspot_height)) / 32,
        0.22,
        0.58,
      );
      const marker = new THREE.Mesh(
        new THREE.RingGeometry(radius * 0.58, radius, 32),
        new THREE.MeshBasicMaterial({
          color: '#d9ff59',
          transparent: true,
          opacity: 0.94,
          side: THREE.DoubleSide,
          depthTest: false,
        }),
      );
      const centerX = Number(item.hotspot_x) + Number(item.hotspot_width) / 2;
      const centerY = Number(item.hotspot_y) + Number(item.hotspot_height) / 2;
      marker.position.set(
        (centerX / 100 - 0.5) * roomWidth,
        (0.5 - centerY / 100) * roomHeight,
        -7.86,
      );
      marker.renderOrder = 5;
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
      const height = Math.max(440, host.clientHeight);
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
        0.06,
        0.55,
      );
      lastX = event.clientX;
      lastY = event.clientY;
    };
    const pointerUp = (event: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      if (!moved) {
        const rect = renderer.domElement.getBoundingClientRect();
        pointer.set(
          ((event.clientX - rect.left) / rect.width) * 2 - 1,
          -((event.clientY - rect.top) / rect.height) * 2 + 1,
        );
        raycaster.setFromCamera(pointer, camera);
        const hit = raycaster.intersectObjects(markerMeshes, false)[0];
        if (hit?.object.userData.item) onSelect(hit.object.userData.item);
      }
    };
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      distanceRef.current = THREE.MathUtils.clamp(
        distanceRef.current + event.deltaY * 0.006,
        4,
        9,
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

      target.set(
        avatar.position.x,
        avatar.position.y + 1.45,
        avatar.position.z,
      );
      const horizontal = Math.cos(pitchRef.current) * distanceRef.current;
      desiredCamera.set(
        target.x + Math.sin(yawRef.current) * horizontal,
        target.y + 1 + Math.sin(pitchRef.current) * distanceRef.current,
        target.z + Math.cos(yawRef.current) * horizontal,
      );
      camera.position.lerp(desiredCamera, 1 - Math.pow(0.001, dt));
      camera.lookAt(target);

      markerMeshes.forEach((marker, index) => {
        const active = marker.userData.item.id === selectedRef.current;
        const material = marker.material as THREE.MeshBasicMaterial;
        material.color.set(active ? '#ff5a7a' : '#d9ff59');
        const pulse = 1 + Math.sin(now * 0.003 + index) * 0.08;
        marker.scale.setScalar(active ? 1.25 : pulse);
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
      texture.dispose();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          if (Array.isArray(object.material))
            object.material.forEach((m) => m.dispose());
          else object.material.dispose();
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
      avatarRef.current = null;
    };
  }, [room.id, room.image_url, onSelect]);

  return (
    <div className="relative overflow-hidden rounded-3xl border-4 border-white bg-[#171d1a] shadow-xl">
      <div ref={hostRef} className="h-[62vh] min-h-[460px] w-full touch-none" />
      <div className="pointer-events-none absolute left-4 top-4 rounded-2xl bg-black/55 px-4 py-3 text-xs font-semibold text-white backdrop-blur">
        <p>Move your character · Drag to orbit the camera</p>
        <p className="mt-1 text-white/70">
          Arrows or WASD · Scroll to zoom · Click glowing objects
        </p>
      </div>
      <div className="absolute bottom-4 left-4 grid grid-cols-3 gap-1 rounded-2xl bg-black/55 p-2 backdrop-blur">
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

function createAvatar() {
  const avatar = new THREE.Group() as AvatarRig;
  const skin = new THREE.MeshStandardMaterial({
    color: '#dca47d',
    roughness: 0.75,
  });
  const shirt = new THREE.MeshStandardMaterial({
    color: '#6b5cff',
    roughness: 0.65,
  });
  const trousers = new THREE.MeshStandardMaterial({
    color: '#28364c',
    roughness: 0.8,
  });
  const shoes = new THREE.MeshStandardMaterial({
    color: '#f3efe7',
    roughness: 0.7,
  });
  const hair = new THREE.MeshStandardMaterial({
    color: '#493326',
    roughness: 0.9,
  });

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
  const hairstyle = new THREE.Mesh(
    new THREE.SphereGeometry(0.355, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.52),
    hair,
  );
  hairstyle.position.y = 2.23;
  hairstyle.castShadow = true;
  avatar.add(hairstyle);

  const limbGeometry = new THREE.CapsuleGeometry(0.11, 0.62, 5, 10);
  const leftArm = new THREE.Mesh(limbGeometry, skin);
  const rightArm = new THREE.Mesh(limbGeometry, skin);
  leftArm.position.set(-0.48, 1.28, 0);
  rightArm.position.set(0.48, 1.28, 0);
  leftArm.castShadow = rightArm.castShadow = true;
  avatar.add(leftArm, rightArm);

  const legGeometry = new THREE.CapsuleGeometry(0.14, 0.7, 5, 10);
  const leftLeg = new THREE.Mesh(legGeometry, trousers);
  const rightLeg = new THREE.Mesh(legGeometry, trousers);
  leftLeg.position.set(-0.19, 0.38, 0);
  rightLeg.position.set(0.19, 0.38, 0);
  leftLeg.castShadow = rightLeg.castShadow = true;
  avatar.add(leftLeg, rightLeg);
  for (const x of [-0.19, 0.19]) {
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.16, 0.46), shoes);
    shoe.position.set(x, -0.05, -0.08);
    shoe.castShadow = true;
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
