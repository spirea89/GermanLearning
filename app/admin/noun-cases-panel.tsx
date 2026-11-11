'use client';

import { useEffect, useRef, useState } from 'react';
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
import type { NounCaseGameItem } from '@/lib/game-content';
import { BulkLevelMover, SelectionCheckbox } from './bulk-level-mover';

const HEADER =
  'prompt\tcorrect_answer\tbase_article\tnoun\tgrammatical_case\tdeterminer_type\tenglish_translation\texplanation\tactive\tsort_order';
const EMPTY: Omit<NounCaseGameItem, 'id' | 'level'> = {
  prompt: '___ ',
  correct_answer: '',
  base_article: 'der',
  noun: '',
  grammatical_case: 'Nominativ',
  determiner_type: 'definite',
  english_translation: '',
  explanation: '',
  active: true,
  sort_order: 10,
};

export function NounCasesPanel({
  items,
  level,
  reload,
}: {
  items: NounCaseGameItem[];
  level: string;
  reload: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [message, setMessage] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => setSelectedIds([]), [level]);
  function edit(item?: NounCaseGameItem) {
    setEditingId(item?.id ?? null);
    setForm(
      item ?? { ...EMPTY, sort_order: (items.at(-1)?.sort_order ?? 0) + 10 },
    );
    setMessage('');
    setOpen(true);
  }
  async function save() {
    if (
      !form.prompt.includes('___') ||
      !form.correct_answer.trim() ||
      !form.noun.trim()
    ) {
      setMessage('Add a ___ blank, the correct answer, and the noun.');
      return;
    }
    const values = {
      ...form,
      level,
      prompt: form.prompt.trim(),
      correct_answer: form.correct_answer.trim(),
      noun: form.noun.trim(),
      english_translation: form.english_translation.trim(),
      explanation: form.explanation.trim(),
    };
    const result = editingId
      ? await supabase
          .from('noun_case_content')
          .update(values)
          .eq('id', editingId)
      : await supabase.from('noun_case_content').insert(values);
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
      .from('noun_case_content')
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
    const clean = (value: unknown) =>
      String(value ?? '').replace(/[\t\r\n]+/g, ' ');
    const rows = items.map((item) =>
      [
        item.prompt,
        item.correct_answer,
        item.base_article,
        item.noun,
        item.grammatical_case,
        item.determiner_type,
        item.english_translation,
        item.explanation,
        item.active,
        item.sort_order,
      ]
        .map(clean)
        .join('\t'),
    );
    const url = URL.createObjectURL(
      new Blob(
        [
          `# Lernzeit · ${level} · Artikel & Kasus\n${HEADER}\n${rows.join('\n')}\n`,
        ],
        { type: 'text/plain;charset=utf-8' },
      ),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = `lernzeit-${level.toLowerCase()}-artikel-kasus.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }
  async function importTxt(file: File) {
    const lines = (await file.text())
      .split(/\r?\n/)
      .filter((line) => line.trim() && !line.startsWith('#'));
    if (lines[0] !== HEADER) {
      setMessage(
        'Invalid file. Export first to download the current template.',
      );
      return;
    }
    const rows = lines.slice(1).map((line, index) => {
      const parts = line.split('\t');
      return {
        level,
        prompt: parts[0]?.trim() ?? '',
        correct_answer: parts[1]?.trim() ?? '',
        base_article: ['der', 'die', 'das'].includes(parts[2])
          ? parts[2]
          : 'der',
        noun: parts[3]?.trim() ?? '',
        grammatical_case: [
          'Nominativ',
          'Akkusativ',
          'Dativ',
          'Genitiv',
        ].includes(parts[4])
          ? parts[4]
          : 'Nominativ',
        determiner_type: ['definite', 'indefinite', 'possessive'].includes(
          parts[5],
        )
          ? parts[5]
          : 'definite',
        english_translation: parts[6]?.trim() ?? '',
        explanation: parts[7]?.trim() ?? '',
        active: parts[8]?.trim().toLowerCase() !== 'false',
        sort_order: Number(parts[9]) || (items.length + index + 1) * 10,
      };
    });
    if (
      !rows.length ||
      rows.some(
        (row) =>
          !row.prompt.includes('___') || !row.correct_answer || !row.noun,
      )
    ) {
      setMessage(
        'Import stopped: a row is missing its blank, answer, or noun.',
      );
      return;
    }
    const { error } = await supabase.from('noun_case_content').insert(rows);
    if (error) {
      setMessage(error.message);
      return;
    }
    await reload();
    setMessage(`Imported ${rows.length} exercises.`);
  }

  return (
    <div>
      <div className="flex flex-wrap justify-end gap-2">
        <input
          ref={fileRef}
          type="file"
          accept=".txt,text/plain"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void importTxt(file);
            event.target.value = '';
          }}
        />
        <Button variant="outline" onClick={() => fileRef.current?.click()}>
          <Upload /> Import .txt
        </Button>
        <Button variant="outline" onClick={exportTxt}>
          <Download /> Export .txt
        </Button>
        <Button className="bg-[#1f6f4a]" onClick={() => edit()}>
          <Plus /> Add exercise
        </Button>
      </div>
      {message && (
        <p className="mt-4 rounded-xl bg-[#eff7f1] p-3 text-sm text-[#336848]">
          {message}
        </p>
      )}
      <BulkLevelMover
        table="noun_case_content"
        currentLevel={level}
        selectedIds={selectedIds}
        onMoved={async () => {
          setSelectedIds([]);
          await reload();
        }}
      />
      <div className="mt-5 overflow-hidden rounded-2xl border bg-white">
        {!!items.length && (
          <div className="flex items-center gap-3 border-b bg-[#f8faf7] px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[#748078]">
            <SelectionCheckbox
              checked={selectedIds.length === items.length}
              onChange={(checked) =>
                setSelectedIds(checked ? items.map((item) => item.id) : [])
              }
              label="Select all article and case exercises"
            />
            Select all {level} exercises
          </div>
        )}
        {!items.length && (
          <p className="px-5 py-8 text-center text-sm text-[#718077]">
            No {level} article and case exercises yet.
          </p>
        )}
        {items.map((item) => (
          <div
            key={item.id}
            className="grid grid-cols-[24px_1fr_120px_44px] items-center gap-4 border-b px-5 py-4 last:border-0 hover:bg-[#f8faf7]"
          >
            <SelectionCheckbox
              checked={selectedIds.includes(item.id)}
              onChange={(checked) =>
                setSelectedIds((current) =>
                  checked
                    ? [...current, item.id]
                    : current.filter((id) => id !== item.id),
                )
              }
              label={`Select ${item.prompt}`}
            />
            <span>
              <strong>{item.prompt.replace('___', item.correct_answer)}</strong>
              <span className="mt-1 block text-xs text-[#718077]">
                {item.base_article} {item.noun} · {item.determiner_type}
              </span>
            </span>
            <span className="text-xs font-semibold">
              {item.grammatical_case}
            </span>
            <button
              type="button"
              onClick={() => edit(item)}
              aria-label={`Edit ${item.prompt}`}
              className="grid size-9 place-items-center rounded-lg text-[#718077] hover:bg-[#edf3ec]"
            >
              <Pencil size={16} />
            </button>
          </div>
        ))}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Edit exercise' : 'Add exercise'}
            </DialogTitle>
            <DialogDescription>
              Use ___ where the learner must enter the correct article or
              possessive form.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2 sm:grid-cols-2">
            <Field
              wide
              label="Sentence with ___ blank"
              value={form.prompt}
              onChange={(value) => setForm({ ...form, prompt: value })}
            />
            <Field
              label="Correct answer"
              value={form.correct_answer}
              onChange={(value) => setForm({ ...form, correct_answer: value })}
            />
            <Field
              label="Noun"
              value={form.noun}
              onChange={(value) => setForm({ ...form, noun: value })}
            />
            <SelectField
              label="Base article"
              value={form.base_article}
              options={['der', 'die', 'das']}
              onChange={(value) =>
                setForm({
                  ...form,
                  base_article: value as 'der' | 'die' | 'das',
                })
              }
            />
            <SelectField
              label="Case"
              value={form.grammatical_case}
              options={['Nominativ', 'Akkusativ', 'Dativ', 'Genitiv']}
              onChange={(value) =>
                setForm({
                  ...form,
                  grammatical_case:
                    value as NounCaseGameItem['grammatical_case'],
                })
              }
            />
            <SelectField
              label="Determiner type"
              value={form.determiner_type}
              options={['definite', 'indefinite', 'possessive']}
              onChange={(value) =>
                setForm({
                  ...form,
                  determiner_type: value as NounCaseGameItem['determiner_type'],
                })
              }
            />
            <Field
              label="English translation"
              value={form.english_translation}
              onChange={(value) =>
                setForm({ ...form, english_translation: value })
              }
            />
            <Field
              wide
              label="Explanation"
              value={form.explanation}
              onChange={(value) => setForm({ ...form, explanation: value })}
            />
            <Field
              label="Order"
              type="number"
              value={String(form.sort_order)}
              onChange={(value) =>
                setForm({ ...form, sort_order: Number(value) })
              }
            />
            <label className="flex items-end gap-2 pb-2 text-sm">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(event) =>
                  setForm({ ...form, active: event.target.checked })
                }
              />
              Visible to learners
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
                <Trash2 /> Delete
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button className="bg-[#1f6f4a]" onClick={() => void save()}>
                Save
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  wide,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  wide?: boolean;
  type?: string;
}) {
  return (
    <label className={`text-sm font-medium ${wide ? 'sm:col-span-2' : ''}`}>
      {label}
      <Input
        className="mt-1"
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="text-sm font-medium">
      {label}
      <select
        className="mt-1 h-9 w-full rounded-md border bg-white px-3"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}
