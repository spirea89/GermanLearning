'use client';

import { useMemo, useState } from 'react';
import { Home, Plus, Trash2, X } from 'lucide-react';
import {
  HOUSE_INVENTORY,
  HOUSE_ROOM_TYPES,
  inventoryImage,
  inventoryForRoom,
  type HouseLevel,
  type UserHouseRoom,
} from '@/lib/house-inventory';
import { InventoryObjectPreview } from './inventory-object-preview';

export function HouseBuilder({
  level,
  rooms,
  onChange,
  onClose,
  builtInRooms,
}: {
  level: HouseLevel;
  rooms: UserHouseRoom[];
  onChange: (rooms: UserHouseRoom[]) => void;
  onClose: () => void;
  builtInRooms: { key: string; name: string; objectCount: number }[];
}) {
  const roomsAtLevel = rooms.filter((room) => room.level === level);
  const [editingId, setEditingId] = useState<string | null>(
    roomsAtLevel[0]?.id ?? null,
  );
  const editingRoom = rooms.find((room) => room.id === editingId) ?? null;
  const [draftName, setDraftName] = useState('');
  const [draftType, setDraftType] = useState('bedroom');
  const [draftObjects, setDraftObjects] = useState<string[]>([]);
  const isNew = editingId === 'new';
  const roomType = isNew ? draftType : (editingRoom?.roomType ?? 'bedroom');
  const selectedObjects = isNew ? draftObjects : (editingRoom?.objectIds ?? []);
  const availableObjects = useMemo(
    () => inventoryForRoom(roomType, level),
    [roomType, level],
  );

  const updateObjects = (objectIds: string[]) => {
    const nextPlacements = { ...(editingRoom?.placements ?? {}) };
    Object.keys(nextPlacements).forEach((id) => {
      if (!objectIds.includes(id)) delete nextPlacements[id];
    });
    if (isNew) {
      setDraftObjects(objectIds);
    } else if (editingRoom)
      onChange(
        rooms.map((room) =>
          room.id === editingRoom.id
            ? { ...room, objectIds, placements: nextPlacements }
            : room,
        ),
      );
  };
  const startNew = () => {
    setEditingId('new');
    setDraftName('');
    setDraftType('bedroom');
    setDraftObjects([]);
  };
  const createRoom = () => {
    const name = draftName.trim();
    if (!name || !draftObjects.length) return;
    const id = crypto.randomUUID();
    onChange([
      ...rooms,
      {
        id,
        name,
        roomType: draftType,
        level,
        objectIds: draftObjects,
        placements: {},
      },
    ]);
    setEditingId(id);
  };
  const removeRoom = (id: string) => {
    onChange(rooms.filter((room) => room.id !== id));
    setEditingId(roomsAtLevel.find((room) => room.id !== id)?.id ?? null);
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/55 p-3 backdrop-blur-sm">
      <section className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-white/30 bg-[#f7f2e8] text-[#23342b] shadow-2xl">
        <header className="flex items-center justify-between border-b border-[#d8d0c2] px-5 py-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.18em] text-[#397356]">
              My house · {level}
            </p>
            <h2 className="mt-1 text-2xl font-semibold">Room designer</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close room designer"
            className="grid size-10 place-items-center rounded-full bg-white shadow-sm hover:bg-[#ece6da]"
          >
            <X />
          </button>
        </header>
        <div className="grid min-h-0 flex-1 md:grid-cols-[250px_1fr]">
          <aside className="overflow-y-auto border-b border-[#d8d0c2] bg-[#eee6d7] p-4 md:border-b-0 md:border-r">
            <button
              type="button"
              onClick={startNew}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1f6f4a] px-4 py-3 font-bold text-white shadow-sm hover:bg-[#18583b]"
            >
              <Plus size={18} /> Add a room
            </button>
            <div className="mt-4 space-y-2">
              <p className="px-1 text-[10px] font-bold uppercase tracking-[.16em] text-[#68776f]">
                Included rooms
              </p>
              {builtInRooms.map((room) => (
                <div
                  key={room.key}
                  className="rounded-xl border border-[#c9d7cb] bg-[#e1ece3] p-3"
                >
                  <span className="flex items-center gap-2 font-bold">
                    <Home size={16} /> {room.name}
                  </span>
                  <span className="mt-1 block text-xs text-[#68776f]">
                    Included · {room.objectCount} objects
                  </span>
                </div>
              ))}
              <p className="px-1 pt-3 text-[10px] font-bold uppercase tracking-[.16em] text-[#68776f]">
                My rooms
              </p>
              {roomsAtLevel.map((room) => {
                const type = HOUSE_ROOM_TYPES.find(
                  (entry) => entry.key === room.roomType,
                );
                return (
                  <button
                    key={room.id}
                    type="button"
                    onClick={() => setEditingId(room.id)}
                    className={`w-full rounded-xl border p-3 text-left transition ${editingId === room.id ? 'border-[#1f6f4a] bg-white shadow-sm' : 'border-transparent hover:bg-white/60'}`}
                  >
                    <span className="flex items-center gap-2 font-bold">
                      <Home size={16} />
                      {room.name}
                    </span>
                    <span className="mt-1 block text-xs text-[#68776f]">
                      {type?.german} · {room.objectIds.length} objects
                    </span>
                  </button>
                );
              })}
              {!roomsAtLevel.length && !isNew ? (
                <p className="rounded-xl border border-dashed border-[#bfb5a4] p-4 text-center text-sm text-[#68776f]">
                  Create your first room and furnish it in German.
                </p>
              ) : null}
            </div>
          </aside>
          <main className="min-h-0 overflow-y-auto p-5 md:p-7">
            {isNew ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-bold">
                  Room name
                  <input
                    value={draftName}
                    onChange={(event) => setDraftName(event.target.value)}
                    placeholder="e.g. Mein Schlafzimmer"
                    className="mt-2 h-11 w-full rounded-xl border border-[#cfc7b8] bg-white px-3 font-normal outline-none focus:border-[#1f6f4a]"
                  />
                </label>
                <label className="text-sm font-bold">
                  Room type
                  <select
                    value={draftType}
                    onChange={(event) => {
                      setDraftType(event.target.value);
                      setDraftObjects([]);
                    }}
                    className="mt-2 h-11 w-full rounded-xl border border-[#cfc7b8] bg-white px-3 font-normal outline-none focus:border-[#1f6f4a]"
                  >
                    {HOUSE_ROOM_TYPES.map((type) => (
                      <option key={type.key} value={type.key}>
                        {type.german} · {type.english}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            ) : editingRoom ? (
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[.15em] text-[#397356]">
                    {
                      HOUSE_ROOM_TYPES.find(
                        (type) => type.key === editingRoom.roomType,
                      )?.german
                    }
                  </p>
                  <h3 className="mt-1 text-2xl font-semibold">
                    {editingRoom.name}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => removeRoom(editingRoom.id)}
                  className="flex items-center gap-2 rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-bold text-red-700 hover:bg-red-50"
                >
                  <Trash2 size={16} /> Delete
                </button>
              </div>
            ) : (
              <div className="grid min-h-64 place-items-center text-center text-[#68776f]">
                <div>
                  <Home className="mx-auto mb-3" />
                  <p>Select a room or create a new one.</p>
                </div>
              </div>
            )}

            {isNew || editingRoom ? (
              <>
                <div className="mt-7 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold">
                      German object inventory
                    </h3>
                    <p className="text-sm text-[#68776f]">
                      A2 includes the useful A1 basics. Select everything you
                      want in this room.
                    </p>
                  </div>
                  <span className="rounded-full bg-[#dcebdd] px-3 py-1 text-sm font-bold">
                    {selectedObjects.length} selected
                  </span>
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {availableObjects.map((inventoryItem) => {
                    const selected = selectedObjects.includes(inventoryItem.id);
                    return (
                      <button
                        key={inventoryItem.id}
                        type="button"
                        onClick={() =>
                          updateObjects(
                            selected
                              ? selectedObjects.filter(
                                  (id) => id !== inventoryItem.id,
                                )
                              : [...selectedObjects, inventoryItem.id],
                          )
                        }
                        className={`rounded-xl border p-3 text-left transition ${selected ? 'border-[#1f6f4a] bg-[#dcebdd] ring-1 ring-[#1f6f4a]' : 'border-[#ddd5c8] bg-white hover:border-[#80a98f]'}`}
                      >
                        <div className="mb-3">
                          <InventoryObjectPreview id={inventoryItem.id} />
                        </div>
                        <span className="font-bold">
                          <span
                            className={
                              inventoryItem.article === 'der'
                                ? 'text-blue-600'
                                : inventoryItem.article === 'die'
                                  ? 'text-red-600'
                                  : 'text-emerald-700'
                            }
                          >
                            {inventoryItem.article}
                          </span>{' '}
                          {inventoryItem.noun}
                        </span>
                        <span className="mt-1 flex justify-between text-xs text-[#68776f]">
                          <span>{inventoryItem.english}</span>
                          <span>{inventoryItem.level}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
                {isNew ? (
                  <div className="sticky bottom-0 mt-6 flex justify-end border-t border-[#d8d0c2] bg-[#f7f2e8]/95 pt-4 backdrop-blur">
                    <button
                      type="button"
                      disabled={!draftName.trim() || !draftObjects.length}
                      onClick={createRoom}
                      className="rounded-xl bg-[#1f6f4a] px-5 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Create room
                    </button>
                  </div>
                ) : null}
              </>
            ) : null}
          </main>
        </div>
        <footer className="border-t border-[#d8d0c2] px-5 py-3 text-xs text-[#68776f]">
          Inventory foundation: House · Future building types can supply their
          own room templates and German inventories.
        </footer>
      </section>
    </div>
  );
}

export function customRoomsToItems(rooms: UserHouseRoom[]) {
  return rooms.flatMap((room) =>
    room.objectIds.flatMap((objectId, index) => {
      const inventoryItem = HOUSE_INVENTORY.find(
        (entry) => entry.id === objectId,
      );
      if (!inventoryItem) return [];
      const placement = room.placements?.[objectId];
      return [
        {
          id: `custom-${room.id}-${objectId}`,
          inventory_id: objectId,
          level: room.level,
          room_key: `custom-${room.id}`,
          room_title: room.name,
          article: inventoryItem.article,
          noun: inventoryItem.noun,
          english_translation: inventoryItem.english,
          image_url: inventoryImage(inventoryItem.id),
          battle_image_url: inventoryImage(inventoryItem.id),
          battle_crop_x: 0,
          battle_crop_y: 0,
          battle_crop_width: 100,
          battle_crop_height: 100,
          hotspot_x: placement?.x ?? -1,
          hotspot_y: placement?.z ?? -1,
          hotspot_width: 14,
          hotspot_height: 14,
          active: true,
          sort_order: index,
        },
      ];
    }),
  );
}
