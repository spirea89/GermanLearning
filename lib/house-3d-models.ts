import * as THREE from 'three';

export type HouseModel = { group: THREE.Group; height: number };

const mat = (color: string, roughness = 0.72) =>
  new THREE.MeshStandardMaterial({ color, roughness });

export function createHouseObjectModel(id: string): HouseModel {
  const group = new THREE.Group();
  const box = (
    size: [number, number, number],
    position: [number, number, number],
    color: string,
  ) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), mat(color));
    mesh.position.set(...position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };
  const cylinder = (
    radius: number,
    height: number,
    position: [number, number, number],
    color: string,
  ) => {
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, height, 20),
      mat(color),
    );
    mesh.position.set(...position);
    mesh.castShadow = true;
    group.add(mesh);
    return mesh;
  };
  const torus = (
    radius: number,
    tube: number,
    position: [number, number, number],
    color: string,
  ) => {
    const mesh = new THREE.Mesh(
      new THREE.TorusGeometry(radius, tube, 10, 24),
      mat(color),
    );
    mesh.position.set(...position);
    mesh.castShadow = true;
    group.add(mesh);
    return mesh;
  };
  const legs = (width: number, depth: number, height: number) => {
    for (const x of [-width / 2, width / 2])
      for (const z of [-depth / 2, depth / 2])
        box([0.09, height, 0.09], [x, height / 2, z], '#654737');
  };

  if (id === 'sofa' || id === 'armchair') {
    const width = id === 'sofa' ? 2.4 : 1.15;
    box([width, 0.55, 0.9], [0, 0.48, 0], '#cf716b');
    box([width, 0.8, 0.22], [0, 1.05, -0.4], '#e48b82');
    for (const x of [-width / 2 + 0.13, width / 2 - 0.13])
      box([0.25, 0.72, 0.95], [x, 0.66, 0], '#b85d58');
    return { group, height: 1.45 };
  }
  if (['chair', 'office-chair', 'garden-chair'].includes(id)) {
    box([0.72, 0.13, 0.72], [0, 0.78, 0], '#d28650');
    box([0.72, 0.78, 0.12], [0, 1.2, -0.3], '#bf6e42');
    legs(0.27, 0.27, 0.72);
    return { group, height: 1.62 };
  }
  if (
    [
      'dining-table',
      'coffee-table',
      'desk',
      'workbench',
      'bedside-table',
    ].includes(id)
  ) {
    const small = ['coffee-table', 'bedside-table'].includes(id);
    const width = small ? 1.15 : 2;
    const depth = small ? 0.75 : 1;
    const height = small ? 0.58 : 0.82;
    box([width, 0.16, depth], [0, height, 0], '#b77a4d');
    legs(width * 0.4, depth * 0.35, height);
    return { group, height: height + 0.16 };
  }
  if (id === 'bed') {
    box([2.15, 0.35, 1.45], [0, 0.35, 0], '#80563e');
    box([2.02, 0.24, 1.32], [0, 0.65, 0], '#f0eee5');
    box([0.65, 0.18, 0.52], [-0.55, 0.88, -0.25], '#e9bcb1');
    box([0.14, 1.15, 1.5], [-1.08, 0.58, 0], '#704832');
    return { group, height: 1.15 };
  }
  if (
    [
      'fridge',
      'wardrobe',
      'cupboard',
      'shoe-cabinet',
      'bookshelf',
      'shelf',
    ].includes(id)
  ) {
    const height = id === 'shoe-cabinet' ? 1 : 2.05;
    const width = id === 'fridge' ? 0.95 : 1.35;
    box(
      [width, height, 0.65],
      [0, height / 2, 0],
      id === 'fridge' ? '#e8eeee' : '#9a6847',
    );
    for (let y = 0.35; y < height; y += 0.42)
      box([width * 0.86, 0.06, 0.58], [0, y, 0.02], '#704833');
    box([0.04, 0.42, 0.05], [width * 0.32, height * 0.55, 0.34], '#d1b36f');
    return { group, height };
  }
  if (
    ['washing-machine', 'dryer', 'dishwasher', 'oven', 'microwave'].includes(id)
  ) {
    const height = id === 'microwave' ? 0.62 : 1.05;
    box([0.95, height, 0.78], [0, height / 2, 0], '#e4e9e8');
    const window = cylinder(
      id === 'microwave' ? 0.22 : 0.31,
      0.04,
      [0, height * 0.5, 0.41],
      '#263840',
    );
    window.rotation.x = Math.PI / 2;
    box([0.62, 0.08, 0.05], [0, height - 0.14, 0.42], '#6ea3ad');
    return { group, height };
  }
  if (id === 'car') {
    box([2.5, 0.55, 1.2], [0, 0.55, 0], '#d94f49');
    box([1.25, 0.48, 1.02], [-0.15, 1.02, 0], '#8fc6dc');
    for (const x of [-0.78, 0.78])
      for (const z of [-0.62, 0.62]) {
        const wheel = cylinder(0.25, 0.16, [x, 0.32, z], '#252a2d');
        wheel.rotation.x = Math.PI / 2;
      }
    return { group, height: 1.32 };
  }
  if (id === 'bicycle') {
    for (const x of [-0.62, 0.62]) {
      const wheel = torus(0.42, 0.055, [x, 0.48, 0], '#30363b');
      wheel.rotation.y = Math.PI / 2;
    }
    const frame = box([1.05, 0.07, 0.07], [0, 0.6, 0], '#e67b42');
    frame.rotation.z = -0.35;
    return { group, height: 1.05 };
  }
  if (id === 'bathtub' || id === 'shower') {
    box([1.9, 0.68, 1.05], [0, 0.38, 0], '#e8f0f2');
    box([1.52, 0.16, 0.7], [0, 0.7, 0], '#8bc9d7');
    const tap = torus(0.24, 0.04, [0.65, 1.02, 0], '#c9d3d5');
    tap.rotation.y = Math.PI / 2;
    return { group, height: 1.25 };
  }
  if (id === 'toilet') {
    cylinder(0.42, 0.45, [0, 0.3, 0.1], '#f3f5f2');
    const seat = torus(0.34, 0.09, [0, 0.59, 0.1], '#f3f5f2');
    seat.rotation.x = Math.PI / 2;
    box([0.72, 0.75, 0.35], [0, 0.72, -0.38], '#f3f5f2');
    return { group, height: 1.1 };
  }
  if (['plant', 'tree', 'flower', 'flower-pot'].includes(id)) {
    cylinder(
      id === 'tree' ? 0.18 : 0.28,
      id === 'tree' ? 1.5 : 0.48,
      [0, id === 'tree' ? 0.75 : 0.24, 0],
      id === 'tree' ? '#755137' : '#b66f43',
    );
    const crown = new THREE.Mesh(
      new THREE.SphereGeometry(id === 'tree' ? 0.8 : 0.55, 18, 12),
      mat('#5a9f55'),
    );
    crown.position.y = id === 'tree' ? 1.72 : 0.95;
    crown.castShadow = true;
    group.add(crown);
    return { group, height: id === 'tree' ? 2.55 : 1.5 };
  }
  if (id === 'lamp') {
    cylinder(0.07, 1.5, [0, 0.75, 0], '#5e524a');
    cylinder(0.45, 0.5, [0, 1.72, 0], '#f2d384');
    return { group, height: 2 };
  }
  if (id === 'door') {
    box([1.05, 2.25, 0.16], [0, 1.12, 0], '#a86f45');
    cylinder(0.06, 0.08, [0.38, 1.08, 0.12], '#e0bd62').rotation.x =
      Math.PI / 2;
    return { group, height: 2.25 };
  }
  if (id === 'window' || id === 'mirror') {
    box(
      [1.25, 1.35, 0.08],
      [0, 0.82, 0],
      id === 'window' ? '#9ed8eb' : '#b9d6de',
    );
    box([0.08, 1.45, 0.12], [0, 0.82, 0.03], '#f3eee5');
    box([1.35, 0.08, 0.12], [0, 0.82, 0.03], '#f3eee5');
    return { group, height: 1.55 };
  }
  if (id === 'rug' || id === 'blanket' || id === 'towel' || id === 'curtain') {
    const upright = id === 'curtain' || id === 'towel';
    box(
      upright ? [1.2, 1.5, 0.06] : [1.6, 0.06, 1.1],
      upright ? [0, 0.75, 0] : [0, 0.04, 0],
      '#8eb6c1',
    );
    return { group, height: upright ? 1.5 : 0.1 };
  }
  if (id === 'kettle' || id === 'watering-can') {
    cylinder(0.35, 0.55, [0, 0.3, 0], '#77a9b2');
    const handle = torus(0.35, 0.055, [0, 0.55, 0], '#4f6970');
    handle.rotation.y = Math.PI / 2;
    box([0.42, 0.12, 0.12], [0.42, 0.48, 0], '#77a9b2');
    return { group, height: 0.95 };
  }

  box([0.95, 0.78, 0.78], [0, 0.4, 0], '#d79b61');
  box([0.62, 0.08, 0.05], [0, 0.55, 0.42], '#f5ead9');
  cylinder(0.06, 0.07, [0.32, 0.38, 0.43], '#e5c463').rotation.x = Math.PI / 2;
  return { group, height: 0.82 };
}
