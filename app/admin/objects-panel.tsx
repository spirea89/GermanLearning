'use client';

import { useRef, useState } from 'react';
import { Download, Pencil, Plus, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import type { RoomObjectItem } from '@/lib/game-content';

const HEADER =
  'room_key\troom_title\tarticle\tnoun\tenglish_translation\timage_url\thotspot_x\thotspot_y\thotspot_width\thotspot_height\tactive\tsort_order';
const EMPTY: Omit<RoomObjectItem, 'id' | 'level'> = {
  room_key: 'living_room',
  room_title: 'Living Room',
  article: 'das',
  noun: '',
  english_translation: '',
  image_url: './images/rooms/living-room-a1.png',
  hotspot_x: 10,
  hotspot_y: 10,
  hotspot_width: 15,
  hotspot_height: 15,
  active: true,
  sort_order: 10,
};

export function ObjectsPanel({
  items,
  level,
  reload,
}: {
  items: RoomObjectItem[];
  level: string;
  reload: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false),
    [editingId, setEditingId] = useState<string | null>(null),
    [form, setForm] = useState(EMPTY),
    [message, setMessage] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  function edit(item?: RoomObjectItem) {
    setEditingId(item?.id ?? null);
    setForm(
      item
        ? {
            room_key: item.room_key,
            room_title: item.room_title,
            article: item.article,
            noun: item.noun,
            english_translation: item.english_translation,
            image_url: item.image_url,
            hotspot_x: Number(item.hotspot_x),
            hotspot_y: Number(item.hotspot_y),
            hotspot_width: Number(item.hotspot_width),
            hotspot_height: Number(item.hotspot_height),
            active: item.active,
            sort_order: item.sort_order,
          }
        : { ...EMPTY, sort_order: (items.at(-1)?.sort_order ?? 0) + 10 },
    );
    setMessage('');
    setOpen(true);
  }
  async function save() {
    if (
      !form.room_key.trim() ||
      !form.room_title.trim() ||
      !form.noun.trim() ||
      !form.english_translation.trim() ||
      !form.image_url.trim()
    ) {
      setMessage('Room, noun, translation, and image are required.');
      return;
    }
    const values = {
      ...form,
      level,
      room_key: form.room_key
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, '_'),
      room_title: form.room_title.trim(),
      noun: form.noun.trim(),
      english_translation: form.english_translation.trim(),
      image_url: form.image_url.trim(),
    };
    const result = editingId
      ? await supabase
          .from('room_object_content')
          .update(values)
          .eq('id', editingId)
      : await supabase.from('room_object_content').insert(values);
    if (result.error) {
      setMessage(result.error.message);
      return;
    }
    setOpen(false);
    await reload();
  }
  async function remove() {
    if (!editingId) return;
    const { error } = await supabase
      .from('room_object_content')
      .delete()
      .eq('id', editingId);
    if (error) {
      setMessage(error.message);
      return;
    }
    setOpen(false);
    await reload();
  }
  function exportTxt() {
    const clean = (v: unknown) => String(v ?? '').replace(/[\t\r\n]+/g, ' ');
    const rows = items.map((v) =>
      [
        v.room_key,
        v.room_title,
        v.article,
        v.noun,
        v.english_translation,
        v.image_url,
        v.hotspot_x,
        v.hotspot_y,
        v.hotspot_width,
        v.hotspot_height,
        v.active,
        v.sort_order,
      ]
        .map(clean)
        .join('\t'),
    );
    const url = URL.createObjectURL(
      new Blob(
        [
          `# Lernzeit · ${level} · Room objects\n${HEADER}\n${rows.join('\n')}\n`,
        ],
        { type: 'text/plain;charset=utf-8' },
      ),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = `lernzeit-${level.toLowerCase()}-room-objects.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }
  async function importTxt(file: File) {
    const lines = (await file.text())
      .split(/\r?\n/)
      .filter((line) => line.trim() && !line.startsWith('#'));
    if (lines[0] !== HEADER) {
      setMessage(
        'Invalid file. Export the current data first for the template.',
      );
      return;
    }
    const rows = lines.slice(1).map((line, i) => {
      const p = line.split('\t');
      return {
        level,
        room_key: p[0]?.trim(),
        room_title: p[1]?.trim(),
        article: ['der', 'die', 'das'].includes(p[2]) ? p[2] : 'das',
        noun: p[3]?.trim(),
        english_translation: p[4]?.trim(),
        image_url: p[5]?.trim(),
        hotspot_x: Number(p[6]),
        hotspot_y: Number(p[7]),
        hotspot_width: Number(p[8]),
        hotspot_height: Number(p[9]),
        active: p[10]?.trim().toLowerCase() !== 'false',
        sort_order: Number(p[11]) || (items.length + i + 1) * 10,
      };
    });
    if (
      !rows.length ||
      rows.some(
        (v) =>
          !v.room_key ||
          !v.room_title ||
          !v.noun ||
          !v.english_translation ||
          !v.image_url,
      )
    ) {
      setMessage('Import stopped: required object content is missing.');
      return;
    }
    const { error } = await supabase
      .from('room_object_content')
      .upsert(rows, { onConflict: 'level,room_key,noun' });
    if (error) {
      setMessage(error.message);
      return;
    }
    await reload();
    setMessage(`Imported ${rows.length} objects.`);
  }
  return (
    <div>
      <div className="flex flex-wrap justify-end gap-2">
        <input
          ref={fileRef}
          type="file"
          accept=".txt,text/plain"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void importTxt(f);
            e.target.value = '';
          }}
        />
        <Button variant="outline" onClick={() => fileRef.current?.click()}>
          <Upload />
          Import .txt
        </Button>
        <Button variant="outline" onClick={exportTxt}>
          <Download />
          Export .txt
        </Button>
        <Button onClick={() => edit()} className="bg-[#1f6f4a]">
          <Plus />
          Add object
        </Button>
      </div>
      {message && (
        <p className="mt-4 rounded-xl bg-[#eff7f1] p-3 text-sm text-[#336848]">
          {message}
        </p>
      )}
      <div className="mt-5 overflow-hidden rounded-2xl border bg-white">
        {!items.length && (
          <p className="px-5 py-8 text-center text-sm text-[#718077]">
            No {level} objects yet.
          </p>
        )}
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => edit(item)}
            className="grid w-full grid-cols-[90px_1fr_40px] items-center gap-4 border-b px-5 py-3 text-left last:border-0 hover:bg-[#f8faf7]"
          >
            <ObjectCrop item={item} />
            <span>
              <strong>
                {item.article} {item.noun}
              </strong>
              <span className="block text-xs text-[#718077]">
                {item.room_title} · {item.english_translation}
              </span>
            </span>
            <Pencil size={16} />
          </button>
        ))}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Edit object' : 'Add object'}
            </DialogTitle>
            <DialogDescription>
              Coordinates are percentages of the room image and define both the
              clickable area and battle crop.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2 sm:grid-cols-2">
            <Field
              label="Room key"
              value={form.room_key}
              onChange={(v) => setForm({ ...form, room_key: v })}
            />
            <Field
              label="Room title"
              value={form.room_title}
              onChange={(v) => setForm({ ...form, room_title: v })}
            />
            <label className="text-sm font-medium">
              Article
              <select
                className="mt-1 h-9 w-full rounded-md border bg-white px-3"
                value={form.article}
                onChange={(e) =>
                  setForm({
                    ...form,
                    article: e.target.value as 'der' | 'die' | 'das',
                  })
                }
              >
                <option>der</option>
                <option>die</option>
                <option>das</option>
              </select>
            </label>
            <Field
              label="German noun"
              value={form.noun}
              onChange={(v) => setForm({ ...form, noun: v })}
            />
            <Field
              label="English translation"
              value={form.english_translation}
              onChange={(v) => setForm({ ...form, english_translation: v })}
            />
            <Field
              label="Room image URL"
              value={form.image_url}
              onChange={(v) => setForm({ ...form, image_url: v })}
            />
            {(
              [
                'hotspot_x',
                'hotspot_y',
                'hotspot_width',
                'hotspot_height',
              ] as const
            ).map((key) => (
              <Field
                key={key}
                label={key.replace('hotspot_', 'Hotspot ')}
                type="number"
                value={String(form[key])}
                onChange={(v) => setForm({ ...form, [key]: Number(v) })}
              />
            ))}
            <Field
              label="Order"
              type="number"
              value={String(form.sort_order)}
              onChange={(v) => setForm({ ...form, sort_order: Number(v) })}
            />
            <label className="flex items-end gap-2 pb-2 text-sm">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
              />
              Visible
            </label>
            {message && (
              <p className="text-xs text-red-600 sm:col-span-2">{message}</p>
            )}
          </div>
          <DialogFooter className="justify-between sm:justify-between">
            {editingId ? (
              <Button
                variant="outline"
                className="text-red-600"
                onClick={() => void remove()}
              >
                <Trash2 />
                Delete
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => void save()} className="bg-[#1f6f4a]">
                Save
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
function ObjectCrop({ item }: { item: RoomObjectItem }) {
  const x = Number(item.hotspot_x),
    y = Number(item.hotspot_y),
    w = Number(item.hotspot_width),
    h = Number(item.hotspot_height);
  return (
    <span
      className="block aspect-square w-20 rounded-lg border bg-cover bg-no-repeat"
      style={{
        backgroundImage: `url(${item.image_url})`,
        backgroundSize: `${10000 / w}% auto`,
        backgroundPosition: `${(x / (100 - w)) * 100}% ${(y / (100 - h)) * 100}%`,
      }}
    />
  );
}
function Field({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="text-sm font-medium">
      {label}
      <Input
        className="mt-1"
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
