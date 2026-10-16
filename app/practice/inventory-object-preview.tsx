'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { createHouseObjectModel } from '@/lib/house-3d-models';

export function InventoryObjectPreview({
  id,
  compact = false,
}: {
  id: string;
  compact?: boolean;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 30);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    host.appendChild(renderer.domElement);
    scene.add(new THREE.HemisphereLight('#fff8e9', '#7c8d7d', 2.8));
    const light = new THREE.DirectionalLight('#fff4d7', 3);
    light.position.set(-3, 6, 5);
    light.castShadow = true;
    scene.add(light);
    const { group } = createHouseObjectModel(id);
    scene.add(group);
    const bounds = new THREE.Box3().setFromObject(group);
    const center = bounds.getCenter(new THREE.Vector3());
    const size = bounds.getSize(new THREE.Vector3());
    group.position.sub(center);
    group.position.y += size.y / 2;
    const extent = Math.max(size.x, size.y, size.z, 0.8);
    camera.position.set(extent * 1.65, extent * 1.25, extent * 2.15);
    camera.lookAt(0, size.y * 0.42, 0);
    const resize = () => {
      const width = Math.max(host.clientWidth, 48);
      const height = Math.max(host.clientHeight, 48);
      renderer.setSize(width, height, true);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();
    renderer.render(scene, camera);
    return () => {
      observer.disconnect();
      scene.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.geometry.dispose();
        if (Array.isArray(object.material))
          object.material.forEach((material) => material.dispose());
        else object.material.dispose();
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [id]);
  return (
    <div
      ref={hostRef}
      className={`${compact ? 'size-full' : 'h-24 w-full'} rounded-lg bg-[radial-gradient(circle_at_50%_70%,#dce8dd,transparent_70%)]`}
    />
  );
}
