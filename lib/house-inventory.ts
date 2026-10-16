export type HouseLevel = 'A1' | 'A2';

export type HouseRoomType = {
  key: string;
  german: string;
  english: string;
};

export type HouseInventoryItem = {
  id: string;
  article: 'der' | 'die' | 'das';
  noun: string;
  english: string;
  level: HouseLevel;
  rooms: string[];
};

export type UserHouseRoom = {
  id: string;
  name: string;
  roomType: string;
  level: HouseLevel;
  objectIds: string[];
  placements?: Record<string, { x: number; z: number }>;
};

const OBJECT_SYMBOLS: Record<string, string> = {
  door: '🚪',
  mirror: '🪞',
  'coat-rack': '🧥',
  'shoe-cabinet': '👟',
  sofa: '🛋️',
  armchair: '🪑',
  television: '📺',
  bookshelf: '📚',
  'coffee-table': '🪵',
  rug: '🟫',
  curtain: '🪟',
  fridge: '🧊',
  oven: '♨️',
  sink: '🚰',
  cupboard: '🗄️',
  dishwasher: '🍽️',
  microwave: '📻',
  kettle: '🫖',
  'dining-table': '🍽️',
  chair: '🪑',
  plate: '🍽️',
  glass: '🥛',
  cutlery: '🍴',
  bed: '🛏️',
  wardrobe: '👚',
  'bedside-table': '🗄️',
  pillow: '🛏️',
  blanket: '🧶',
  shower: '🚿',
  bathtub: '🛁',
  toilet: '🚽',
  washbasin: '🚰',
  towel: '🧖',
  tap: '🚰',
  'toy-box': '🧸',
  toy: '🧸',
  desk: '🖥️',
  computer: '💻',
  'office-chair': '🪑',
  printer: '🖨️',
  'washing-machine': '🫧',
  dryer: '♨️',
  'laundry-basket': '🧺',
  'ironing-board': '👔',
  shelf: '🗄️',
  box: '📦',
  tool: '🛠️',
  bicycle: '🚲',
  car: '🚗',
  workbench: '🔧',
  'flower-pot': '🪴',
  plant: '🪴',
  'garden-chair': '🪑',
  'watering-can': '🚿',
  tree: '🌳',
  flower: '🌼',
  lawnmower: '🌱',
  window: '🪟',
  lamp: '💡',
};

export function inventoryImage(id: string) {
  const symbol = OBJECT_SYMBOLS[id] ?? '🏠';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="180" viewBox="0 0 240 180"><ellipse cx="120" cy="148" rx="62" ry="12" fill="#274c3b" opacity=".18"/><text x="120" y="126" text-anchor="middle" font-size="96" font-family="Apple Color Emoji,Segoe UI Emoji,sans-serif">${symbol}</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export const HOUSE_ROOM_TYPES: HouseRoomType[] = [
  { key: 'hallway', german: 'der Flur', english: 'Hallway' },
  { key: 'living_room', german: 'das Wohnzimmer', english: 'Living room' },
  { key: 'kitchen', german: 'die Küche', english: 'Kitchen' },
  { key: 'dining_room', german: 'das Esszimmer', english: 'Dining room' },
  { key: 'bedroom', german: 'das Schlafzimmer', english: 'Bedroom' },
  { key: 'bathroom', german: 'das Badezimmer', english: 'Bathroom' },
  {
    key: 'childrens_room',
    german: 'das Kinderzimmer',
    english: "Children's room",
  },
  { key: 'study', german: 'das Arbeitszimmer', english: 'Study' },
  { key: 'laundry', german: 'die Waschküche', english: 'Laundry room' },
  { key: 'cellar', german: 'der Keller', english: 'Cellar' },
  { key: 'garage', german: 'die Garage', english: 'Garage' },
  { key: 'balcony', german: 'der Balkon', english: 'Balcony' },
  { key: 'garden', german: 'der Garten', english: 'Garden' },
];

const item = (
  id: string,
  article: HouseInventoryItem['article'],
  noun: string,
  english: string,
  level: HouseLevel,
  rooms: string[],
): HouseInventoryItem => ({ id, article, noun, english, level, rooms });

export const HOUSE_INVENTORY: HouseInventoryItem[] = [
  item('door', 'die', 'Tür', 'door', 'A1', [
    'hallway',
    'bedroom',
    'bathroom',
    'cellar',
    'garage',
  ]),
  item('mirror', 'der', 'Spiegel', 'mirror', 'A1', [
    'hallway',
    'bathroom',
    'bedroom',
  ]),
  item('coat-rack', 'die', 'Garderobe', 'coat rack', 'A2', ['hallway']),
  item('shoe-cabinet', 'der', 'Schuhschrank', 'shoe cabinet', 'A2', [
    'hallway',
  ]),
  item('sofa', 'das', 'Sofa', 'sofa', 'A1', ['living_room']),
  item('armchair', 'der', 'Sessel', 'armchair', 'A1', ['living_room']),
  item('television', 'der', 'Fernseher', 'television', 'A1', ['living_room']),
  item('bookshelf', 'das', 'Bücherregal', 'bookshelf', 'A1', [
    'living_room',
    'study',
    'childrens_room',
  ]),
  item('coffee-table', 'der', 'Couchtisch', 'coffee table', 'A2', [
    'living_room',
  ]),
  item('rug', 'der', 'Teppich', 'rug', 'A1', [
    'living_room',
    'bedroom',
    'childrens_room',
  ]),
  item('curtain', 'der', 'Vorhang', 'curtain', 'A2', [
    'living_room',
    'bedroom',
    'childrens_room',
  ]),
  item('fridge', 'der', 'Kühlschrank', 'refrigerator', 'A1', ['kitchen']),
  item('oven', 'der', 'Ofen', 'oven', 'A1', ['kitchen']),
  item('sink', 'das', 'Spülbecken', 'sink', 'A1', ['kitchen']),
  item('cupboard', 'der', 'Schrank', 'cupboard', 'A1', [
    'kitchen',
    'bedroom',
    'cellar',
  ]),
  item('dishwasher', 'die', 'Spülmaschine', 'dishwasher', 'A2', ['kitchen']),
  item('microwave', 'die', 'Mikrowelle', 'microwave', 'A2', ['kitchen']),
  item('kettle', 'der', 'Wasserkocher', 'kettle', 'A1', ['kitchen']),
  item('dining-table', 'der', 'Esstisch', 'dining table', 'A1', [
    'dining_room',
    'kitchen',
  ]),
  item('chair', 'der', 'Stuhl', 'chair', 'A1', [
    'dining_room',
    'kitchen',
    'study',
  ]),
  item('plate', 'der', 'Teller', 'plate', 'A1', ['dining_room', 'kitchen']),
  item('glass', 'das', 'Glas', 'glass', 'A1', ['dining_room', 'kitchen']),
  item('cutlery', 'das', 'Besteck', 'cutlery', 'A2', [
    'dining_room',
    'kitchen',
  ]),
  item('bed', 'das', 'Bett', 'bed', 'A1', ['bedroom', 'childrens_room']),
  item('wardrobe', 'der', 'Kleiderschrank', 'wardrobe', 'A1', ['bedroom']),
  item('bedside-table', 'der', 'Nachttisch', 'bedside table', 'A2', [
    'bedroom',
  ]),
  item('pillow', 'das', 'Kissen', 'pillow', 'A2', ['bedroom', 'living_room']),
  item('blanket', 'die', 'Decke', 'blanket', 'A2', ['bedroom', 'living_room']),
  item('shower', 'die', 'Dusche', 'shower', 'A1', ['bathroom']),
  item('bathtub', 'die', 'Badewanne', 'bathtub', 'A1', ['bathroom']),
  item('toilet', 'die', 'Toilette', 'toilet', 'A1', ['bathroom']),
  item('washbasin', 'das', 'Waschbecken', 'washbasin', 'A1', ['bathroom']),
  item('towel', 'das', 'Handtuch', 'towel', 'A1', ['bathroom']),
  item('tap', 'der', 'Wasserhahn', 'tap', 'A2', ['bathroom', 'kitchen']),
  item('toy-box', 'die', 'Spielzeugkiste', 'toy box', 'A2', ['childrens_room']),
  item('toy', 'das', 'Spielzeug', 'toy', 'A1', ['childrens_room']),
  item('desk', 'der', 'Schreibtisch', 'desk', 'A1', [
    'study',
    'childrens_room',
  ]),
  item('computer', 'der', 'Computer', 'computer', 'A1', ['study']),
  item('office-chair', 'der', 'Bürostuhl', 'office chair', 'A2', ['study']),
  item('printer', 'der', 'Drucker', 'printer', 'A2', ['study']),
  item('washing-machine', 'die', 'Waschmaschine', 'washing machine', 'A1', [
    'laundry',
  ]),
  item('dryer', 'der', 'Trockner', 'dryer', 'A2', ['laundry']),
  item('laundry-basket', 'der', 'Wäschekorb', 'laundry basket', 'A2', [
    'laundry',
    'bathroom',
  ]),
  item('ironing-board', 'das', 'Bügelbrett', 'ironing board', 'A2', [
    'laundry',
  ]),
  item('shelf', 'das', 'Regal', 'shelf', 'A1', ['cellar', 'garage', 'laundry']),
  item('box', 'die', 'Kiste', 'box', 'A1', ['cellar', 'garage']),
  item('tool', 'das', 'Werkzeug', 'tool', 'A1', ['cellar', 'garage']),
  item('bicycle', 'das', 'Fahrrad', 'bicycle', 'A1', ['garage', 'cellar']),
  item('car', 'das', 'Auto', 'car', 'A1', ['garage']),
  item('workbench', 'die', 'Werkbank', 'workbench', 'A2', ['garage', 'cellar']),
  item('flower-pot', 'der', 'Blumentopf', 'flower pot', 'A2', [
    'balcony',
    'garden',
    'living_room',
  ]),
  item('plant', 'die', 'Pflanze', 'plant', 'A1', [
    'balcony',
    'garden',
    'living_room',
  ]),
  item('garden-chair', 'der', 'Gartenstuhl', 'garden chair', 'A2', [
    'balcony',
    'garden',
  ]),
  item('watering-can', 'die', 'Gießkanne', 'watering can', 'A2', [
    'balcony',
    'garden',
  ]),
  item('tree', 'der', 'Baum', 'tree', 'A1', ['garden']),
  item('flower', 'die', 'Blume', 'flower', 'A1', ['garden', 'balcony']),
  item('lawnmower', 'der', 'Rasenmäher', 'lawnmower', 'A2', [
    'garden',
    'garage',
  ]),
  item(
    'window',
    'das',
    'Fenster',
    'window',
    'A1',
    HOUSE_ROOM_TYPES.filter(
      (room) => !['garden', 'balcony'].includes(room.key),
    ).map((room) => room.key),
  ),
  item(
    'lamp',
    'die',
    'Lampe',
    'lamp',
    'A1',
    HOUSE_ROOM_TYPES.map((room) => room.key),
  ),
];

export function inventoryForRoom(roomType: string, level: HouseLevel) {
  return HOUSE_INVENTORY.filter(
    (inventoryItem) =>
      inventoryItem.rooms.includes(roomType) &&
      (level === 'A2' || inventoryItem.level === 'A1'),
  );
}
