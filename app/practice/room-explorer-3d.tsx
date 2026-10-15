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
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const yawRef = useRef(0);
  const pitchRef = useRef(0);
  const selectedRef = useRef(selectedId);
  selectedRef.current = selectedId;

  function resetCamera() {
    const camera = cameraRef.current;
    if (!camera) return;
    camera.position.set(0, 0, 4.5);
    yawRef.current = 0;
    pitchRef.current = 0;
    camera.rotation.set(0, 0, 0);
  }

  function move(dx: number, dz: number) {
    const camera = cameraRef.current;
    if (!camera) return;
    camera.position.x = THREE.MathUtils.clamp(
      camera.position.x + dx,
      -3.6,
      3.6,
    );
    camera.position.z = THREE.MathUtils.clamp(
      camera.position.z + dz,
      -0.5,
      6.2,
    );
  }

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#171d1a');
    scene.fog = new THREE.Fog('#171d1a', 12, 27);

    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 60);
    camera.position.set(0, 0, 4.5);
    camera.rotation.order = 'YXZ';
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    host.appendChild(renderer.domElement);

    const roomWidth = 16;
    const roomHeight = 9;
    const roomDepth = 15;
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
      new THREE.MeshStandardMaterial({ color: '#7d6652', roughness: 0.82 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, -roomHeight / 2, -0.5);
    floor.receiveShadow = true;
    scene.add(floor);

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
    scene.add(new THREE.HemisphereLight('#fff8e8', '#51463c', 2.2));

    const markerMeshes: THREE.Mesh[] = [];
    items.forEach((item) => {
      const radius = THREE.MathUtils.clamp(
        Math.max(Number(item.hotspot_width), Number(item.hotspot_height)) / 32,
        0.2,
        0.55,
      );
      const marker = new THREE.Mesh(
        new THREE.RingGeometry(radius * 0.58, radius, 32),
        new THREE.MeshBasicMaterial({
          color: '#d9ff59',
          transparent: true,
          opacity: 0.92,
          side: THREE.DoubleSide,
        }),
      );
      const centerX = Number(item.hotspot_x) + Number(item.hotspot_width) / 2;
      const centerY = Number(item.hotspot_y) + Number(item.hotspot_height) / 2;
      marker.position.set(
        (centerX / 100 - 0.5) * roomWidth,
        (0.5 - centerY / 100) * roomHeight,
        -7.88,
      );
      marker.userData.item = item;
      scene.add(marker);
      markerMeshes.push(marker);
    });

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let dragging = false;
    let moved = false;
    let lastX = 0;
    let lastY = 0;
    const keys = new Set<string>();

    const resize = () => {
      const width = host.clientWidth;
      const height = Math.max(420, host.clientHeight);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const down = (event: PointerEvent) => {
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
      yawRef.current = THREE.MathUtils.clamp(
        yawRef.current - dx * 0.0035,
        -0.62,
        0.62,
      );
      pitchRef.current = THREE.MathUtils.clamp(
        pitchRef.current - dy * 0.003,
        -0.32,
        0.32,
      );
      lastX = event.clientX;
      lastY = event.clientY;
    };
    const up = (event: PointerEvent) => {
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
      move(0, event.deltaY * 0.004);
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
    renderer.domElement.addEventListener('pointerdown', down);
    renderer.domElement.addEventListener('pointermove', pointerMove);
    renderer.domElement.addEventListener('pointerup', up);
    renderer.domElement.addEventListener('wheel', wheel, { passive: false });
    window.addEventListener('keydown', keyDown);
    window.addEventListener('keyup', keyUp);
    resize();

    let frame = 0;
    let previous = performance.now();
    const animate = (now: number) => {
      const dt = Math.min((now - previous) / 1000, 0.05);
      previous = now;
      const speed = 3.2 * dt;
      if (keys.has('arrowleft') || keys.has('a')) move(-speed, 0);
      if (keys.has('arrowright') || keys.has('d')) move(speed, 0);
      if (keys.has('arrowup') || keys.has('w')) move(0, -speed);
      if (keys.has('arrowdown') || keys.has('s')) move(0, speed);
      camera.rotation.y = yawRef.current;
      camera.rotation.x = pitchRef.current;
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
      renderer.domElement.removeEventListener('pointerdown', down);
      renderer.domElement.removeEventListener('pointermove', pointerMove);
      renderer.domElement.removeEventListener('pointerup', up);
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
      cameraRef.current = null;
    };
  }, [room.id, room.image_url, onSelect]);

  return (
    <div className="relative overflow-hidden rounded-3xl border-4 border-white bg-[#171d1a] shadow-xl">
      <div ref={hostRef} className="h-[58vh] min-h-[420px] w-full touch-none" />
      <div className="pointer-events-none absolute left-4 top-4 rounded-2xl bg-black/55 px-4 py-3 text-xs font-semibold text-white backdrop-blur">
        <p>Drag to look · Scroll to move</p>
        <p className="mt-1 text-white/70">
          Arrow keys or WASD · Click glowing targets
        </p>
      </div>
      <div className="absolute bottom-4 left-4 grid grid-cols-3 gap-1 rounded-2xl bg-black/55 p-2 backdrop-blur">
        <span />
        <Control label="Move forward" onClick={() => move(0, -0.65)}>
          <ArrowUp />
        </Control>
        <Control label="Reset view" onClick={resetCamera}>
          <RotateCcw />
        </Control>
        <Control label="Move left" onClick={() => move(-0.65, 0)}>
          <ArrowLeft />
        </Control>
        <Control label="Move backward" onClick={() => move(0, 0.65)}>
          <ArrowDown />
        </Control>
        <Control label="Move right" onClick={() => move(0.65, 0)}>
          <ArrowRight />
        </Control>
      </div>
      <span className="pointer-events-none absolute left-1/2 top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/70" />
    </div>
  );
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
