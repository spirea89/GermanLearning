'use client';

export const dynamic = 'force-static';

import { useEffect, useMemo, useState } from 'react';
import { BookOpen, CalendarDays, Check, ChevronLeft, ChevronRight, CircleHelp, Clock3, LogIn, LogOut, MoreHorizontal, Plus, Settings, Sparkles, Swords, Trash2 } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import { addDays, addWeeks, format, isSameDay, startOfDay, startOfWeek } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';

const APP_VERSION = '0.19.0';
const STORAGE_KEY = 'lernzeit-blockers-v1';
type Blocker = { id: string; name: string; date: string; start: string; end: string; kind: 'learning' | 'busy'; source?: string; battleRank?: number | null };
const INITIAL_WEEK = startOfWeek(new Date(), { weekStartsOn: 1 });
const INITIAL_BLOCKERS: Blocker[] = [
  { id: 'sample-1', name: 'Morning focus', date: format(addDays(INITIAL_WEEK, 0), 'yyyy-MM-dd'), start: '08:00', end: '09:00', kind: 'learning' },
  { id: 'sample-2', name: 'Team meeting', date: format(addDays(INITIAL_WEEK, 1), 'yyyy-MM-dd'), start: '10:00', end: '11:30', kind: 'busy' },
  { id: 'sample-3', name: 'Grammar practice', date: format(addDays(INITIAL_WEEK, 2), 'yyyy-MM-dd'), start: '18:00', end: '19:00', kind: 'learning' },
  { id: 'sample-4', name: 'Dentist', date: format(addDays(INITIAL_WEEK, 3), 'yyyy-MM-dd'), start: '14:00', end: '15:00', kind: 'busy' },
  { id: 'sample-5', name: 'Weekly review', date: format(addDays(INITIAL_WEEK, 6), 'yyyy-MM-dd'), start: '10:00', end: '11:00', kind: 'learning' },
];
function minutes(value: string) { const [hour, minute] = value.split(':').map(Number); return hour * 60 + minute; }
function formatTime(value: string) { const [hour, minute] = value.split(':').map(Number); return `${hour % 12 || 12}${minute ? `:${String(minute).padStart(2, '0')}` : ''} ${hour >= 12 ? 'PM' : 'AM'}`; }
function isoDate(value: Date) { return format(value, 'yyyy-MM-dd'); }
function rowToBlocker(row: { id: string; title: string; starts_at: string; ends_at: string; kind: 'learning' | 'busy'; source?: string; battle_rank?: number | null }): Blocker {
  const starts = new Date(row.starts_at); const ends = new Date(row.ends_at);
  return { id: row.id, name: row.title, date: starts.toLocaleDateString('en-CA', { timeZone: 'Europe/Vienna' }), start: starts.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Europe/Vienna' }), end: ends.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Europe/Vienna' }), kind: row.kind, source: row.source, battleRank: row.battle_rank };
}

export default function Home() {
  const [blockers, setBlockers] = useState<Blocker[]>(INITIAL_BLOCKERS);
  const [addOpen, setAddOpen] = useState(false);
  const [editingBlocker, setEditingBlocker] = useState<Blocker | null>(null);
  const [selectedDay, setSelectedDay] = useState(0);
  const [name, setName] = useState('German study');
  const [start, setStart] = useState('17:00');
  const [end, setEnd] = useState('18:00');
  const [notice, setNotice] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authMessage, setAuthMessage] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const days = useMemo(() => Array.from({ length: 7 }, (_, index) => { const value = addDays(weekStart, index); return { value, iso: isoDate(value), name: format(value, 'EEE'), date: format(value, 'd') }; }), [weekStart]);
  const weekEnd = addDays(weekStart, 7);

  useEffect(() => { const saved = window.localStorage.getItem(STORAGE_KEY); if (saved) { try { const parsed = JSON.parse(saved) as Array<Blocker & { day?: number }>; setBlockers(parsed.filter((item) => item.date).map((item) => ({ ...item, date: item.date }))); } catch { /* keep starter plan */ } } }, []);
  useEffect(() => { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(blockers)); }, [blockers]);
  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (!user) return;
    void supabase.from('learning_blocks').select('*').gte('starts_at', startOfDay(weekStart).toISOString()).lt('starts_at', startOfDay(weekEnd).toISOString()).order('starts_at').then(({ data }) => {
      setBlockers((data ?? []).map(rowToBlocker));
    });
  }, [user, weekStart]);
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
        const blocker: Blocker = { id: crypto.randomUUID(), name: input.name.trim(), date: days[input.day].iso, start: input.start, end: input.end, kind: 'learning' };
        setBlockers((current) => [...current, blocker]); return { id: blocker.id, status: 'created' };
      },
    }, { signal: lifecycle.signal })).catch(() => undefined);
    return () => lifecycle.abort();
  }, [days]);
  const learningHours = useMemo(() => blockers.filter((item) => item.kind === 'learning' && days.some((day) => day.iso === item.date)).reduce((total, item) => total + (minutes(item.end) - minutes(item.start)) / 60, 0), [blockers, days]);
  const weekLabel = `${format(weekStart, 'MMM d')} – ${format(addDays(weekStart, 6), 'MMM d, yyyy')}`;
  async function addBlocker() {
    if (!name.trim() || minutes(end) <= minutes(start)) { setNotice('Choose a name and an end time after the start time.'); return; }
    const selectedDate = days[selectedDay].iso;
    const local: Blocker = { id: editingBlocker?.id ?? crypto.randomUUID(), name: name.trim(), date: selectedDate, start, end, kind: 'learning' };
    const startsAt = new Date(`${selectedDate}T${start}:00`).toISOString();
    const endsAt = new Date(`${selectedDate}T${end}:00`).toISOString();
    if (editingBlocker) {
      if (user && !editingBlocker.id.startsWith('sample-')) {
        const { error } = await supabase.from('learning_blocks').update({ title: local.name, starts_at: startsAt, ends_at: endsAt }).eq('id', editingBlocker.id);
        if (error) { setNotice(error.message); return; }
      }
      setBlockers((current) => current.map((item) => item.id === editingBlocker.id ? local : item));
    } else if (user) {
      const { data, error } = await supabase.from('learning_blocks').insert({ user_id: user.id, title: local.name, starts_at: startsAt, ends_at: endsAt, kind: 'learning', source: 'manual' }).select('id').single();
      if (error) { setNotice(error.message); return; }
      local.id = data.id;
      setBlockers((current) => [...current, local]);
    } else {
      setBlockers((current) => [...current, local]);
    }
    setAddOpen(false); setEditingBlocker(null); setNotice('');
  }
  async function removeBlocker(item: Blocker) {
    if (user && !item.id.startsWith('sample-')) await supabase.from('learning_blocks').delete().eq('id', item.id);
    setBlockers((current) => current.filter((entry) => entry.id !== item.id));
  }
  function openNewBlocker(day = 0) {
    setEditingBlocker(null); setSelectedDay(day); setName('German study'); setStart('17:00'); setEnd('18:00'); setNotice(''); setAddOpen(true);
  }
  function openEditBlocker(item: Blocker) {
    setEditingBlocker(item); setSelectedDay(Math.max(days.findIndex((day) => day.iso === item.date), 0)); setName(item.name); setStart(item.start); setEnd(item.end); setNotice(''); setAddOpen(true);
  }
  async function submitAuth() {
    setAuthBusy(true); setAuthMessage('');
    const result = authMode === 'signin' ? await supabase.auth.signInWithPassword({ email, password }) : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: 'https://spirea89.github.io/GermanLearning/' } });
    setAuthBusy(false);
    if (result.error) { setAuthMessage(result.error.message); return; }
    if (authMode === 'signup' && !result.data.session) { setAuthMessage('Check your email to confirm your account.'); return; }
    setAuthOpen(false); setPassword('');
  }
  return <main className="min-h-screen bg-[#f5f7f2] text-[#17221b]">
    <header className="border-b border-[#dce3d9] bg-white/90 px-5 py-3 backdrop-blur md:px-8"><div className="mx-auto flex max-w-[1500px] items-center justify-between">
      <div className="flex items-center gap-3"><div className="grid size-9 place-items-center rounded-xl bg-[#1f6f4a] text-white"><BookOpen size={19} /></div><div><p className="font-semibold leading-tight tracking-[-0.02em]">Lernzeit</p><p className="text-[11px] text-[#718077]">German, one day at a time</p></div></div>
      <nav className="main-nav hidden items-center gap-2 rounded-xl p-1 md:flex" aria-label="Main navigation"><a href="./" className="main-nav-link rounded-lg px-4 py-2 text-sm">Battles</a><span className="main-nav-link main-nav-link--active flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium shadow-sm"><CalendarDays size={16} />Learning Plan</span><a href="./practice.html" className="main-nav-link flex items-center gap-2 rounded-lg px-4 py-2 text-sm"><Sparkles size={16} />Games</a></nav>
      <div className="flex items-center gap-2"><button aria-label="Help" className="grid size-9 place-items-center rounded-lg text-[#718077] hover:bg-[#edf3ec]"><CircleHelp size={18} /></button><a href="./admin.html" aria-label="Administration" className="hidden size-9 place-items-center rounded-lg text-[#718077] hover:bg-[#edf3ec] sm:grid"><Settings size={18} /></a>{user ? <Button variant="outline" className="max-w-48" onClick={() => void supabase.auth.signOut()}><LogOut /><span className="hidden truncate sm:inline">{user.email}</span><span className="sm:hidden">Sign out</span></Button> : <Button variant="outline" onClick={() => setAuthOpen(true)}><LogIn />Sign in</Button>}</div>
    </div></header>
    <section className="mx-auto max-w-[1500px] px-5 py-8 md:px-8">
      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#3c805d]">Your weekly rhythm</p><h1 className="text-3xl font-semibold tracking-[-0.035em] md:text-4xl">Learning Plan</h1><p className="mt-2 max-w-xl text-sm text-[#66736b]">Make space for German around the life you already have.</p></div><Button onClick={() => openNewBlocker()} className="h-11 rounded-xl bg-[#1f6f4a] px-4 hover:bg-[#185c3d]"><Plus /> Add learning time</Button></div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_310px]">
        <section className="overflow-hidden rounded-2xl border border-[#dce3d9] bg-white shadow-[0_8px_30px_rgba(38,65,48,0.05)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e3e8e0] px-4 py-4 sm:px-6"><div className="flex items-center gap-2"><Button variant="outline" size="icon" aria-label="Previous week" onClick={() => setWeekStart((current) => addWeeks(current, -1))}><ChevronLeft /></Button><Button variant="outline" size="icon" aria-label="Next week" onClick={() => setWeekStart((current) => addWeeks(current, 1))}><ChevronRight /></Button><h2 className="ml-2 text-sm font-semibold sm:text-base">{weekLabel}</h2></div><div className="flex items-center gap-4 text-xs text-[#66736b]"><span className="flex items-center gap-2"><i className="size-2.5 rounded-full bg-[#3b8c61]" />Learning</span><span className="flex items-center gap-2"><i className="size-2.5 rounded-full bg-[#cbd3ce]" />Busy</span></div></div>
          <div className="max-h-[720px] overflow-auto"><div className="min-w-[760px]">
            <div className="sticky top-0 z-20 grid grid-cols-[64px_repeat(7,1fr)] border-b border-[#e3e8e0] bg-white"><div />{days.map((day) => { const today = isSameDay(day.value, new Date()); return <div key={day.iso} className={`border-l border-[#e8ece6] py-3 text-center ${today ? 'bg-[#f0f7f2]' : ''}`}><p className="text-[11px] font-medium uppercase tracking-wider text-[#718077]">{day.name}</p><p className={`mx-auto mt-1 grid size-8 place-items-center rounded-full text-sm font-semibold ${today ? 'bg-[#1f6f4a] text-white' : ''}`}>{day.date}</p></div>; })}</div>
            <div className="relative grid h-[1440px] grid-cols-[64px_repeat(7,1fr)] bg-[linear-gradient(to_bottom,transparent_59px,#e8ece6_60px)] bg-[size:100%_60px]">
              <div className="relative">{Array.from({ length: 24 }, (_, i) => <span key={i} className="absolute right-3 -translate-y-2 text-[10px] text-[#8a968e]" style={{ top: i * 60 }}>{`${String(i).padStart(2, '0')}:00`}</span>)}</div>
              {days.map((day, dayIndex) => { const today = isSameDay(day.value, new Date()); return <div key={day.iso} className={`relative border-l border-[#e8ece6] ${today ? 'bg-[#f0f7f2]/55' : ''}`} onDoubleClick={() => openNewBlocker(dayIndex)}>{blockers.filter((item) => item.date === day.iso).map((item) => { const top = minutes(item.start); const height = Math.max(minutes(item.end) - minutes(item.start), 34); const content = <><span className="block truncate text-[11px] font-semibold">{item.name}</span><span className="block text-[9px] opacity-70">{formatTime(item.start)}–{formatTime(item.end)}</span></>; if(item.source==='battle'){const podium=item.battleRank===1?'battle-event--gold':item.battleRank===2?'battle-event--silver':item.battleRank===3?'battle-event--bronze':'battle-event--standard';return <div key={item.id} title={item.battleRank?`Battle result: rank ${item.battleRank}`:'Scheduled German Battle'} className={`battle-event ${podium} absolute left-1.5 right-1.5 cursor-default overflow-hidden rounded-lg border px-2 py-1.5 text-left`} style={{top,height}}>{content}</div>;}return item.kind === 'learning' && item.source !== 'practice' ? <button key={item.id} title="Edit learning time" onClick={() => openEditBlocker(item)} className="group absolute left-1.5 right-1.5 overflow-hidden rounded-lg border border-[#91c3a5] bg-[#dff2e5] px-2 py-1.5 text-left text-[#155838] transition hover:brightness-95" style={{ top, height }}>{content}</button> : item.source === 'practice' ? <div key={item.id} title="Practice time is updated automatically" className="absolute left-1.5 right-1.5 cursor-default overflow-hidden rounded-lg border border-[#91c3a5] bg-[#dff2e5] px-2 py-1.5 text-left text-[#155838]" style={{ top, height }}>{content}</div> : <div key={item.id} title="Busy time" className="absolute left-1.5 right-1.5 cursor-default overflow-hidden rounded-lg border border-[#d5dcd7] bg-[#eef1ef] px-2 py-1.5 text-left text-[#5e6962]" style={{ top, height }}>{content}</div>; })}</div>; })}
            </div>
          </div></div>
        </section>
        <aside className="space-y-5">
          <section className="rounded-2xl bg-[#183e2b] p-5 text-white shadow-[0_12px_30px_rgba(24,62,43,0.16)]"><div className="mb-5 flex items-start justify-between"><div className="grid size-10 place-items-center rounded-xl bg-white/10"><Clock3 size={20} /></div><MoreHorizontal className="text-white/60" /></div><p className="text-sm text-white/70">Planned this week</p><p className="mt-1 text-4xl font-semibold tracking-[-0.04em]">{learningHours.toFixed(1)} <span className="text-xl font-normal text-white/65">hours</span></p><div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-[#e8bd78]" style={{ width: `${Math.min((learningHours / 7) * 100, 100)}%` }} /></div><p className="mt-2 text-xs text-white/60">Weekly goal: 7 hours</p></section>
          <section className="rounded-2xl border border-[#dce3d9] bg-white p-5"><div className="flex items-start gap-3"><div className="grid size-9 place-items-center rounded-lg bg-[#eef3fb] text-[#3674bb]"><Swords size={18} /></div><div><h2 className="font-semibold">Battle calendar</h2><p className="mt-0.5 text-xs leading-relaxed text-[#718077]">Battles are added automatically when you create or join them.</p></div></div><div className="mt-5 grid grid-cols-2 gap-2 text-xs"><span className="battle-legend battle-event--gold">1st · Gold</span><span className="battle-legend battle-event--silver">2nd · Silver</span><span className="battle-legend battle-event--bronze">3rd · Bronze</span><span className="battle-legend battle-event--standard">4th+ · Standard</span></div><p className="mt-4 text-xs leading-relaxed text-[#718077]">After the battle finishes, its calendar event updates with your final rank.</p></section>
          <section className="rounded-2xl border border-[#eadfc7] bg-[#fffaf0] p-4"><p className="text-xs font-semibold text-[#7b5a20]">Planning tip</p><p className="mt-1 text-xs leading-relaxed text-[#806c49]">Short, repeatable sessions beat the occasional marathon. Try 30 minutes at the same time each day.</p></section>
        </aside>
      </div>
    </section>
    <footer className="mx-auto flex max-w-[1500px] items-center justify-between px-5 pb-6 text-[11px] text-[#87928a] md:px-8"><span>{user ? 'Synced with your Lernzeit account' : 'Saved on this device'}</span><span>Version {APP_VERSION}</span></footer>
    <Dialog open={authOpen} onOpenChange={setAuthOpen}><DialogContent className="max-w-md rounded-2xl p-5"><DialogHeader><DialogTitle className="text-xl">{authMode === 'signin' ? 'Welcome back' : 'Create your Lernzeit account'}</DialogTitle><DialogDescription>Sign in to keep your learning plan safely synced across devices.</DialogDescription></DialogHeader><div className="space-y-4 py-2"><label className="block text-sm font-medium">Email<Input className="mt-2 h-10" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" /></label><label className="block text-sm font-medium">Password<Input className="mt-2 h-10" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={authMode === 'signin' ? 'current-password' : 'new-password'} /></label>{authMessage && <p className="rounded-lg bg-[#f4f7f3] p-3 text-xs text-[#526158]">{authMessage}</p>}<button className="text-xs font-medium text-[#1f6f4a] underline-offset-4 hover:underline" onClick={() => { setAuthMode(authMode === 'signin' ? 'signup' : 'signin'); setAuthMessage(''); }}>{authMode === 'signin' ? 'New here? Create an account' : 'Already have an account? Sign in'}</button></div><DialogFooter className="-mx-5 -mb-5 px-5"><Button variant="outline" onClick={() => setAuthOpen(false)}>Cancel</Button><Button disabled={authBusy || !email || password.length < 6} onClick={() => void submitAuth()} className="bg-[#1f6f4a] hover:bg-[#185c3d]">{authBusy ? 'Please wait…' : authMode === 'signin' ? 'Sign in' : 'Create account'}</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={addOpen} onOpenChange={(open) => { setAddOpen(open); if (!open) setEditingBlocker(null); }}><DialogContent className="max-w-md rounded-2xl p-5"><DialogHeader><DialogTitle className="text-xl">{editingBlocker ? 'Edit learning time' : 'Add learning time'}</DialogTitle><DialogDescription>{editingBlocker ? 'Update this session or remove it from your plan.' : 'Protect a little time for focused German practice.'}</DialogDescription></DialogHeader><div className="space-y-4 py-2"><label className="block text-sm font-medium">Name<Input className="mt-2 h-10" value={name} onChange={(event) => setName(event.target.value)} /></label><label className="block text-sm font-medium">Day<select className="mt-2 h-10 w-full rounded-lg border border-input bg-white px-3 text-sm" value={selectedDay} onChange={(event) => setSelectedDay(Number(event.target.value))}>{days.map((day, index) => <option key={day.iso} value={index}>{format(day.value, 'EEE, MMMM d')}</option>)}</select></label><div className="grid grid-cols-2 gap-3"><label className="block text-sm font-medium">Starts<Input className="mt-2 h-10" type="time" value={start} onChange={(event) => setStart(event.target.value)} /></label><label className="block text-sm font-medium">Ends<Input className="mt-2 h-10" type="time" value={end} onChange={(event) => setEnd(event.target.value)} /></label></div>{notice && <p className="text-xs text-red-600">{notice}</p>}</div><DialogFooter className="-mx-5 -mb-5 justify-between px-5 sm:justify-between">{editingBlocker ? <Button variant="outline" className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => { void removeBlocker(editingBlocker); setAddOpen(false); setEditingBlocker(null); }}><Trash2 />Delete</Button> : <span />}<div className="flex gap-2"><Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button><Button onClick={() => void addBlocker()} className="bg-[#1f6f4a] hover:bg-[#185c3d]"><Check />{editingBlocker ? 'Save changes' : 'Add to plan'}</Button></div></DialogFooter></DialogContent></Dialog>
  </main>;
}
