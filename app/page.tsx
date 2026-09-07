'use client';

export const dynamic = 'force-static';

import { useEffect, useMemo, useState } from 'react';
import { BookOpen, CalendarDays, Check, ChevronLeft, ChevronRight, CircleHelp, Clock3, Cloud, MoreHorizontal, Plus, Settings, Sparkles, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

const APP_VERSION = '0.1.0';
const STORAGE_KEY = 'lernzeit-blockers-v1';
type Blocker = { id: string; name: string; day: number; start: string; end: string; kind: 'learning' | 'busy' };
const DAYS = [{ name: 'Mon', date: '7' }, { name: 'Tue', date: '8' }, { name: 'Wed', date: '9' }, { name: 'Thu', date: '10' }, { name: 'Fri', date: '11' }, { name: 'Sat', date: '12' }, { name: 'Sun', date: '13' }];
const INITIAL_BLOCKERS: Blocker[] = [
  { id: 'sample-1', name: 'Morning focus', day: 0, start: '08:00', end: '09:00', kind: 'learning' },
  { id: 'sample-2', name: 'Team meeting', day: 1, start: '10:00', end: '11:30', kind: 'busy' },
  { id: 'sample-3', name: 'Grammar practice', day: 2, start: '18:00', end: '19:00', kind: 'learning' },
  { id: 'sample-4', name: 'Dentist', day: 3, start: '14:00', end: '15:00', kind: 'busy' },
  { id: 'sample-5', name: 'Weekly review', day: 6, start: '10:00', end: '11:00', kind: 'learning' },
];
const SOURCES = [
  { id: 'google', label: 'Google Calendar', detail: 'Import your busy times', mark: 'G', color: '#4285F4' },
  { id: 'outlook', label: 'Outlook', detail: 'Microsoft 365 calendar', mark: 'O', color: '#0078D4' },
  { id: 'apple', label: 'Apple Calendar', detail: 'Import an .ics calendar', mark: '●', color: '#6b7280' },
];
function minutes(value: string) { const [hour, minute] = value.split(':').map(Number); return hour * 60 + minute; }
function formatTime(value: string) { const [hour, minute] = value.split(':').map(Number); return `${hour % 12 || 12}${minute ? `:${String(minute).padStart(2, '0')}` : ''} ${hour >= 12 ? 'PM' : 'AM'}`; }

export default function Home() {
  const [blockers, setBlockers] = useState<Blocker[]>(INITIAL_BLOCKERS);
  const [addOpen, setAddOpen] = useState(false);
  const [connectOpen, setConnectOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState(0);
  const [name, setName] = useState('German study');
  const [start, setStart] = useState('17:00');
  const [end, setEnd] = useState('18:00');
  const [notice, setNotice] = useState('');

  useEffect(() => { const saved = window.localStorage.getItem(STORAGE_KEY); if (saved) { try { setBlockers(JSON.parse(saved)); } catch { /* keep starter plan */ } } }, []);
  useEffect(() => { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(blockers)); }, [blockers]);
  useEffect(() => {
    const context = (document as Document & { modelContext?: { registerTool?: (...args: unknown[]) => unknown } }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    void Promise.resolve(context.registerTool({
      name: 'create_learning_blocker', title: 'Create learning blocker',
      description: 'Add a named blocked or learning time to the visible weekly learning plan.',
      inputSchema: { type: 'object', properties: { name: { type: 'string' }, day: { type: 'integer', minimum: 0, maximum: 6 }, start: { type: 'string', pattern: '^([01]\\d|2[0-3]):[0-5]\\d$' }, end: { type: 'string', pattern: '^([01]\\d|2[0-3]):[0-5]\\d$' } }, required: ['name', 'day', 'start', 'end'], additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input: { name: string; day: number; start: string; end: string }) {
        if (!input.name.trim() || input.day < 0 || input.day > 6 || minutes(input.end) <= minutes(input.start)) throw new Error('Invalid blocker details.');
        const blocker: Blocker = { ...input, name: input.name.trim(), id: crypto.randomUUID(), kind: 'learning' };
        setBlockers((current) => [...current, blocker]); return { id: blocker.id, status: 'created' };
      },
    }, { signal: lifecycle.signal })).catch(() => undefined);
    return () => lifecycle.abort();
  }, []);
  const learningHours = useMemo(() => blockers.filter((item) => item.kind === 'learning').reduce((total, item) => total + (minutes(item.end) - minutes(item.start)) / 60, 0), [blockers]);
  function addBlocker() { if (!name.trim() || minutes(end) <= minutes(start)) { setNotice('Choose a name and an end time after the start time.'); return; } setBlockers((current) => [...current, { id: crypto.randomUUID(), name: name.trim(), day: selectedDay, start, end, kind: 'learning' }]); setAddOpen(false); setNotice(''); }

  return <main className="min-h-screen bg-[#f5f7f2] text-[#17221b]">
    <header className="border-b border-[#dce3d9] bg-white/90 px-5 py-3 backdrop-blur md:px-8"><div className="mx-auto flex max-w-[1500px] items-center justify-between">
      <div className="flex items-center gap-3"><div className="grid size-9 place-items-center rounded-xl bg-[#1f6f4a] text-white"><BookOpen size={19} /></div><div><p className="font-semibold leading-tight tracking-[-0.02em]">Lernzeit</p><p className="text-[11px] text-[#718077]">German, one day at a time</p></div></div>
      <nav className="hidden items-center gap-2 rounded-xl bg-[#edf3ec] p-1 md:flex" aria-label="Main navigation"><button className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium shadow-sm"><CalendarDays size={16} />Learning plan</button><button className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm text-[#718077]" disabled><Sparkles size={16} />Practice</button></nav>
      <div className="flex items-center gap-2"><button aria-label="Help" className="grid size-9 place-items-center rounded-lg text-[#718077] hover:bg-[#edf3ec]"><CircleHelp size={18} /></button><button aria-label="Settings" className="grid size-9 place-items-center rounded-lg text-[#718077] hover:bg-[#edf3ec]"><Settings size={18} /></button><div className="grid size-9 place-items-center rounded-full bg-[#e5b66b] text-sm font-semibold text-[#442c0c]">MS</div></div>
    </div></header>
    <section className="mx-auto max-w-[1500px] px-5 py-8 md:px-8">
      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#3c805d]">Your weekly rhythm</p><h1 className="text-3xl font-semibold tracking-[-0.035em] md:text-4xl">Learning Plan</h1><p className="mt-2 max-w-xl text-sm text-[#66736b]">Make space for German around the life you already have.</p></div><Button onClick={() => setAddOpen(true)} className="h-11 rounded-xl bg-[#1f6f4a] px-4 hover:bg-[#185c3d]"><Plus /> Add learning time</Button></div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_310px]">
        <section className="overflow-hidden rounded-2xl border border-[#dce3d9] bg-white shadow-[0_8px_30px_rgba(38,65,48,0.05)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e3e8e0] px-4 py-4 sm:px-6"><div className="flex items-center gap-2"><Button variant="outline" size="icon" aria-label="Previous week"><ChevronLeft /></Button><Button variant="outline" size="icon" aria-label="Next week"><ChevronRight /></Button><h2 className="ml-2 text-sm font-semibold sm:text-base">September 7 – 13, 2026</h2></div><div className="flex items-center gap-4 text-xs text-[#66736b]"><span className="flex items-center gap-2"><i className="size-2.5 rounded-full bg-[#3b8c61]" />Learning</span><span className="flex items-center gap-2"><i className="size-2.5 rounded-full bg-[#cbd3ce]" />Busy</span></div></div>
          <div className="overflow-x-auto"><div className="min-w-[760px]">
            <div className="grid grid-cols-[64px_repeat(7,1fr)] border-b border-[#e3e8e0]"><div />{DAYS.map((day, index) => <div key={day.name} className={`border-l border-[#e8ece6] py-3 text-center ${index === 0 ? 'bg-[#f0f7f2]' : ''}`}><p className="text-[11px] font-medium uppercase tracking-wider text-[#718077]">{day.name}</p><p className={`mx-auto mt-1 grid size-8 place-items-center rounded-full text-sm font-semibold ${index === 0 ? 'bg-[#1f6f4a] text-white' : ''}`}>{day.date}</p></div>)}</div>
            <div className="relative grid h-[660px] grid-cols-[64px_repeat(7,1fr)] bg-[linear-gradient(to_bottom,transparent_59px,#e8ece6_60px)] bg-[size:100%_60px]">
              <div className="relative">{Array.from({ length: 11 }, (_, i) => <span key={i} className="absolute right-3 -translate-y-2 text-[10px] text-[#8a968e]" style={{ top: i * 60 }}>{`${8 + i}:00`}</span>)}</div>
              {DAYS.map((day, dayIndex) => <div key={day.name} className={`relative border-l border-[#e8ece6] ${dayIndex === 0 ? 'bg-[#f0f7f2]/55' : ''}`} onDoubleClick={() => { setSelectedDay(dayIndex); setAddOpen(true); }}>{blockers.filter((item) => item.day === dayIndex).map((item) => { const top = ((minutes(item.start) - 480) / 60) * 60; const height = Math.max(((minutes(item.end) - minutes(item.start)) / 60) * 60, 34); return <button key={item.id} title="Click to remove" onClick={() => setBlockers((current) => current.filter((entry) => entry.id !== item.id))} className={`group absolute left-1.5 right-1.5 overflow-hidden rounded-lg border px-2 py-1.5 text-left transition hover:brightness-95 ${item.kind === 'learning' ? 'border-[#91c3a5] bg-[#dff2e5] text-[#155838]' : 'border-[#d5dcd7] bg-[#eef1ef] text-[#5e6962]'}`} style={{ top, height }}><span className="block truncate text-[11px] font-semibold">{item.name}</span><span className="block text-[9px] opacity-70">{formatTime(item.start)}–{formatTime(item.end)}</span><Trash2 className="absolute right-1.5 top-1.5 hidden size-3 group-hover:block" /></button>; })}</div>)}
            </div>
          </div></div>
        </section>
        <aside className="space-y-5">
          <section className="rounded-2xl bg-[#183e2b] p-5 text-white shadow-[0_12px_30px_rgba(24,62,43,0.16)]"><div className="mb-5 flex items-start justify-between"><div className="grid size-10 place-items-center rounded-xl bg-white/10"><Clock3 size={20} /></div><MoreHorizontal className="text-white/60" /></div><p className="text-sm text-white/70">Planned this week</p><p className="mt-1 text-4xl font-semibold tracking-[-0.04em]">{learningHours.toFixed(1)} <span className="text-xl font-normal text-white/65">hours</span></p><div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-[#e8bd78]" style={{ width: `${Math.min((learningHours / 7) * 100, 100)}%` }} /></div><p className="mt-2 text-xs text-white/60">Weekly goal: 7 hours</p></section>
          <section className="rounded-2xl border border-[#dce3d9] bg-white p-5"><div className="flex items-start gap-3"><div className="grid size-9 place-items-center rounded-lg bg-[#eef3fb] text-[#3674bb]"><Cloud size={18} /></div><div><h2 className="font-semibold">Your calendars</h2><p className="mt-0.5 text-xs leading-relaxed text-[#718077]">Bring in busy times to protect your study plan.</p></div></div><div className="mt-5 space-y-2.5">{SOURCES.map((source) => <button key={source.id} onClick={() => setConnectOpen(true)} className="flex w-full items-center gap-3 rounded-xl border border-[#e1e6df] p-3 text-left transition hover:border-[#aac4b2] hover:bg-[#f7faf7]"><span className="grid size-8 place-items-center rounded-lg bg-[#f0f3f1] text-xs font-bold" style={{ color: source.color }}>{source.mark}</span><span className="min-w-0 flex-1"><span className="block text-sm font-medium">{source.label}</span><span className="block truncate text-[11px] text-[#7b8780]">{source.detail}</span></span><Plus size={15} className="text-[#829087]" /></button>)}</div></section>
          <section className="rounded-2xl border border-[#eadfc7] bg-[#fffaf0] p-4"><p className="text-xs font-semibold text-[#7b5a20]">Planning tip</p><p className="mt-1 text-xs leading-relaxed text-[#806c49]">Short, repeatable sessions beat the occasional marathon. Try 30 minutes at the same time each day.</p></section>
        </aside>
      </div>
    </section>
    <footer className="mx-auto flex max-w-[1500px] items-center justify-between px-5 pb-6 text-[11px] text-[#87928a] md:px-8"><span>Saved on this device</span><span>Version {APP_VERSION}</span></footer>
    <Dialog open={addOpen} onOpenChange={setAddOpen}><DialogContent className="max-w-md rounded-2xl p-5"><DialogHeader><DialogTitle className="text-xl">Add learning time</DialogTitle><DialogDescription>Protect a little time for focused German practice.</DialogDescription></DialogHeader><div className="space-y-4 py-2"><label className="block text-sm font-medium">Name<Input className="mt-2 h-10" value={name} onChange={(event) => setName(event.target.value)} /></label><label className="block text-sm font-medium">Day<select className="mt-2 h-10 w-full rounded-lg border border-input bg-white px-3 text-sm" value={selectedDay} onChange={(event) => setSelectedDay(Number(event.target.value))}>{DAYS.map((day, index) => <option key={day.name} value={index}>{day.name}, September {day.date}</option>)}</select></label><div className="grid grid-cols-2 gap-3"><label className="block text-sm font-medium">Starts<Input className="mt-2 h-10" type="time" value={start} onChange={(event) => setStart(event.target.value)} /></label><label className="block text-sm font-medium">Ends<Input className="mt-2 h-10" type="time" value={end} onChange={(event) => setEnd(event.target.value)} /></label></div>{notice && <p className="text-xs text-red-600">{notice}</p>}</div><DialogFooter className="-mx-5 -mb-5 px-5"><Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button><Button onClick={addBlocker} className="bg-[#1f6f4a] hover:bg-[#185c3d]"><Check />Add to plan</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={connectOpen} onOpenChange={setConnectOpen}><DialogContent className="max-w-md rounded-2xl p-5"><DialogHeader><DialogTitle className="text-xl">Calendar connections are next</DialogTitle><DialogDescription>Secure syncing needs provider credentials and a small backend. Your learning plan works locally in the meantime.</DialogDescription></DialogHeader><div className="rounded-xl border border-[#dfe7df] bg-[#f3f8f4] p-4 text-sm text-[#42604d]">Google and Outlook will use secure sign-in. Apple Calendar will support an iCalendar (.ics) feed or file.</div><DialogFooter className="-mx-5 -mb-5 px-5"><Button onClick={() => setConnectOpen(false)} className="bg-[#1f6f4a] hover:bg-[#185c3d]">Got it</Button></DialogFooter></DialogContent></Dialog>
  </main>;
}
