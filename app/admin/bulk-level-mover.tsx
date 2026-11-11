'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, Layers3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
type ContentTable =
  | 'game_content'
  | 'verb_game_content'
  | 'preposition_game_content'
  | 'room_object_content'
  | 'noun_case_content';

export function BulkLevelMover({
  table,
  currentLevel,
  selectedIds,
  onMoved,
}: {
  table: ContentTable;
  currentLevel: string;
  selectedIds: string[];
  onMoved: () => Promise<void>;
}) {
  const [targetLevel, setTargetLevel] = useState(
    () => LEVELS.find((level) => level !== currentLevel) ?? 'A1',
  );
  const [moving, setMoving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (targetLevel === currentLevel)
      setTargetLevel(LEVELS.find((level) => level !== currentLevel) ?? 'A1');
    setMessage('');
  }, [currentLevel, targetLevel]);

  async function moveSelected() {
    if (!selectedIds.length || targetLevel === currentLevel) return;
    setMoving(true);
    setMessage('');
    const { error } = await supabase
      .from(table)
      .update({ level: targetLevel })
      .in('id', selectedIds);
    setMoving(false);
    if (error) {
      setMessage(
        error.code === '23505'
          ? `One of these entries already exists at ${targetLevel}. Remove the duplicate or move the entries separately.`
          : error.message,
      );
      return;
    }
    const count = selectedIds.length;
    await onMoved();
    setMessage(
      `Moved ${count} ${count === 1 ? 'entry' : 'entries'} to ${targetLevel}.`,
    );
  }

  return (
    <div className="mt-5 rounded-2xl border border-[#cfe2d4] bg-[#f7fbf8] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-xl bg-[#e3f0e7] text-[#1f6f4a]">
            <Layers3 size={18} />
          </span>
          <div>
            <p className="text-sm font-semibold">
              Move selected to another level
            </p>
            <p className="text-xs text-[#718077]">
              {selectedIds.length
                ? `${selectedIds.length} selected from ${currentLevel}`
                : 'Select one or more entries from the list below.'}
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2 min-[420px]:flex-row">
          <select
            aria-label="Destination language level"
            value={targetLevel}
            onChange={(event) => setTargetLevel(event.target.value)}
            className="h-10 rounded-xl border border-[#cbd8ce] bg-white px-3 text-sm font-semibold text-[#26362c]"
          >
            {LEVELS.filter((level) => level !== currentLevel).map((level) => (
              <option key={level} value={level}>
                Move to {level}
              </option>
            ))}
          </select>
          <Button
            disabled={!selectedIds.length || moving}
            onClick={() => void moveSelected()}
            className="h-10 bg-[#1f6f4a] hover:bg-[#185c3d]"
          >
            <ArrowRight />
            {moving ? 'Moving…' : 'Move selected'}
          </Button>
        </div>
      </div>
      {message && (
        <p role="status" className="mt-3 text-xs font-medium text-[#42604d]">
          {message}
        </p>
      )}
    </div>
  );
}

export function SelectionCheckbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={(event) => onChange(event.target.checked)}
      aria-label={label}
      className="size-4 shrink-0 cursor-pointer accent-[#1f6f4a]"
    />
  );
}
