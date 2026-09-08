'use client';

export const dynamic = 'force-static';

import { useEffect, useMemo, useState } from 'react';
import { BookOpen, CalendarDays, Check, ChevronLeft, ChevronRight, CircleHelp, Clock3, Cloud, LogIn, LogOut, MoreHorizontal, Plus, RefreshCw, Settings, Sparkles, Trash2 } from 'lucide-react';
import type { Session, User } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';

const APP_VERSION = '0.6.0';
const STORAGE_KEY = 'lernzeit-blockers-v1';
const GOOGLE_SYNC_PENDING_KEY = 'lernzeit-google-sync-pending';
const WEEK_START = '2026-09-07T00:00:00+02:00';
const WEEK_END = '2026-09-14T00:00:00+02:00';
type Blocker = { id: string; name: string; day: number; start: string; end: string; kind: 'learning' | 'busy'; source?: string };
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
];
function minutes(value: string) { const [hour, minute] = value.split(':').map(Number); return hour * 60 + minute; }
function formatTime(value: string) { const [hour, minute] = value.split(':').map(Number); return `${hour % 12 || 12}${minute ? `:${String(minute).padStart(2, '0')}` : ''} ${hour >= 12 ? 'PM' : 'AM'}`; }
function rowToBlocker(row: { id: string; title: string; starts_at: string; ends_at: string; kind: 'learning' | 'busy'; source?: string }): Blocker {
  const starts = new Date(row.starts_at); const ends = new Date(row.ends_at);
  const weekday = starts.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'Europe/Vienna' });
  return { id: row.id, name: row.title, day: DAYS.findIndex((day) => day.name === weekday), start: starts.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Europe/Vienna' }), end: ends.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Europe/Vienna' }), kind: row.kind, source: row.source };
}

export default function Home() {
  const [blockers, setBlockers] = useState<Blocker[]>(INITIAL_BLOCKERS);
  const [addOpen, setAddOpen] = useState(false);
  const [editingBlocker, setEditingBlocker] = useState<Blocker | null>(null);
  const [connectOpen, setConnectOpen] = useState(false);
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
  const [calendarNotice, setCalendarNotice] = useState('');
  const [syncingGoogle, setSyncingGoogle] = useState(false);

  useEffect(() => { const saved = window.localStorage.getItem(STORAGE_KEY); if (saved) { try { setBlockers(JSON.parse(saved)); } catch { /* keep starter plan */ } } }, []);
  useEffect(() => { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(blockers)); }, [blockers]);
  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      if (data.session && window.localStorage.getItem(GOOGLE_SYNC_PENDING_KEY)) void syncGoogleCalendar(data.session);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (!user) return;
    const weekStart = new Date(WEEK_START);
    const weekEnd = new Date(WEEK_END);
    void supabase.from('learning_blocks').select('*').gte('starts_at', weekStart.toISOString()).lt('starts_at', weekEnd.toISOString()).order('starts_at').then(({ data }) => {
      if (!data?.length) return;
      setBlockers(data.map(rowToBlocker));
    });
  }, [user]);
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
  async function addBlocker() {
    if (!name.trim() || minutes(end) <= minutes(start)) { setNotice('Choose a name and an end time after the start time.'); return; }
    const local: Blocker = { id: editingBlocker?.id ?? crypto.randomUUID(), name: name.trim(), day: selectedDay, start, end, kind: 'learning' };
    if (editingBlocker) {
      if (user && !editingBlocker.id.startsWith('sample-')) {
        const date = 7 + selectedDay;
        const { error } = await supabase.from('learning_blocks').update({ title: local.name, starts_at: `2026-09-${String(date).padStart(2, '0')}T${start}:00+02:00`, ends_at: `2026-09-${String(date).padStart(2, '0')}T${end}:00+02:00` }).eq('id', editingBlocker.id);
        if (error) { setNotice(error.message); return; }
      }
      setBlockers((current) => current.map((item) => item.id === editingBlocker.id ? local : item));
    } else if (user) {
      const date = 7 + selectedDay;
      const { data, error } = await supabase.from('learning_blocks').insert({ user_id: user.id, title: local.name, starts_at: `2026-09-${String(date).padStart(2, '0')}T${start}:00+02:00`, ends_at: `2026-09-${String(date).padStart(2, '0')}T${end}:00+02:00`, kind: 'learning', source: 'manual' }).select('id').single();
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
    setEditingBlocker(item); setSelectedDay(item.day); setName(item.name); setStart(item.start); setEnd(item.end); setNotice(''); setAddOpen(true);
  }
  async function submitAuth() {
    setAuthBusy(true); setAuthMessage('');
    const result = authMode === 'signin' ? await supabase.auth.signInWithPassword({ email, password }) : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: 'https://spirea89.github.io/GermanLearning/' } });
    setAuthBusy(false);
    if (result.error) { setAuthMessage(result.error.message); return; }
    if (authMode === 'signup' && !result.data.session) { setAuthMessage('Check your email to confirm your account.'); return; }
    setAuthOpen(false); setPassword('');
  }
  async function connectGoogle() {
    setCalendarNotice('Opening Google secure sign-in…');
    window.localStorage.setItem(GOOGLE_SYNC_PENDING_KEY, '1');
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: 'https://spirea89.github.io/GermanLearning/', scopes: 'openid email profile https://www.googleapis.com/auth/calendar.readonly', queryParams: { access_type: 'offline', prompt: 'consent' } } });
    if (error) { window.localStorage.removeItem(GOOGLE_SYNC_PENDING_KEY); setCalendarNotice(error.message); }
  }
  async function syncGoogleCalendar(session: Session) {
    if (!session.provider_token || syncingGoogle) { if (!session.provider_token) setCalendarNotice('Google connected, but no Calendar access token was returned. Please connect again.'); return; }
    window.localStorage.removeItem(GOOGLE_SYNC_PENDING_KEY);
    setSyncingGoogle(true); setCalendarNotice('Importing Google Calendar busy times…');
    try {
      const params = new URLSearchParams({ timeMin: new Date(WEEK_START).toISOString(), timeMax: new Date(WEEK_END).toISOString(), singleEvents: 'true', orderBy: 'startTime' });
      const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`, { headers: { Authorization: `Bearer ${session.provider_token}` } });
      if (!response.ok) throw new Error(`Google Calendar returned ${response.status}. Please reconnect and try again.`);
      const payload = await response.json() as { items?: Array<{ id?: string; summary?: string; status?: string; start?: { dateTime?: string }; end?: { dateTime?: string } }> };
      const events = (payload.items ?? []).filter((event) => event.status !== 'cancelled' && event.id && event.start?.dateTime && event.end?.dateTime);
      const weekStartIso = new Date(WEEK_START).toISOString(); const weekEndIso = new Date(WEEK_END).toISOString();
      const { error: deleteError } = await supabase.from('learning_blocks').delete().eq('user_id', session.user.id).eq('source', 'google').gte('starts_at', weekStartIso).lt('starts_at', weekEndIso);
      if (deleteError) throw deleteError;
      if (events.length) {
        const { error: insertError } = await supabase.from('learning_blocks').insert(events.map((event) => ({ user_id: session.user.id, title: event.summary?.trim() || 'Busy', starts_at: event.start!.dateTime!, ends_at: event.end!.dateTime!, kind: 'busy', source: 'google', external_event_id: event.id, external_calendar_id: 'primary' })));
        if (insertError) throw insertError;
      }
      const { data, error: loadError } = await supabase.from('learning_blocks').select('*').gte('starts_at', weekStartIso).lt('starts_at', weekEndIso).order('starts_at');
      if (loadError) throw loadError;
      setBlockers((data ?? []).map(rowToBlocker));
      setCalendarNotice(`Google Calendar connected — imported ${events.length} busy ${events.length === 1 ? 'event' : 'events'}.`);
    } catch (error) { window.localStorage.setItem(GOOGLE_SYNC_PENDING_KEY, '1'); setCalendarNotice(error instanceof Error ? error.message : 'Google Calendar import failed.'); }
    finally { setSyncingGoogle(false); }
  }
  async function refreshGoogleCalendar() {
    const { data } = await supabase.auth.getSession();
    if (!data.session?.provider_token) { await connectGoogle(); return; }
    await syncGoogleCalendar(data.session);
  }

  return <main className="min-h-screen bg-[#f5f7f2] text-[#17221b]">
    <header className="border-b border-[#dce3d9] bg-white/90 px-5 py-3 backdrop-blur md:px-8"><div className="mx-auto flex max-w-[1500px] items-center justify-between">
      <div className="flex items-center gap-3"><div className="grid size-9 place-items-center rounded-xl bg-[#1f6f4a] text-white"><BookOpen size={19} /></div><div><p className="font-semibold leading-tight tracking-[-0.02em]">Lernzeit</p><p className="text-[11px] text-[#718077]">German, one day at a time</p></div></div>
      <nav className="hidden items-center gap-2 rounded-xl bg-[#edf3ec] p-1 md:flex" aria-label="Main navigation"><span className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium shadow-sm"><CalendarDays size={16} />Learning plan</span><a href="./practice.html" className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm text-[#718077] hover:bg-white/60"><Sparkles size={16} />Practice</a></nav>
      <div className="flex items-center gap-2"><button aria-label="Help" className="grid size-9 place-items-center rounded-lg text-[#718077] hover:bg-[#edf3ec]"><CircleHelp size={18} /></button><a href="./admin.html" aria-label="Administration" className="hidden size-9 place-items-center rounded-lg text-[#718077] hover:bg-[#edf3ec] sm:grid"><Settings size={18} /></a>{user ? <Button variant="outline" className="max-w-48" onClick={() => void supabase.auth.signOut()}><LogOut /><span className="hidden truncate sm:inline">{user.email}</span><span className="sm:hidden">Sign out</span></Button> : <Button variant="outline" onClick={() => setAuthOpen(true)}><LogIn />Sign in</Button>}</div>
    </div></header>
    <section className="mx-auto max-w-[1500px] px-5 py-8 md:px-8">
      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#3c805d]">Your weekly rhythm</p><h1 className="text-3xl font-semibold tracking-[-0.035em] md:text-4xl">Learning Plan</h1><p className="mt-2 max-w-xl text-sm text-[#66736b]">Make space for German around the life you already have.</p></div><Button onClick={() => openNewBlocker()} className="h-11 rounded-xl bg-[#1f6f4a] px-4 hover:bg-[#185c3d]"><Plus /> Add learning time</Button></div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_310px]">
        <section className="overflow-hidden rounded-2xl border border-[#dce3d9] bg-white shadow-[0_8px_30px_rgba(38,65,48,0.05)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e3e8e0] px-4 py-4 sm:px-6"><div className="flex items-center gap-2"><Button variant="outline" size="icon" aria-label="Previous week"><ChevronLeft /></Button><Button variant="outline" size="icon" aria-label="Next week"><ChevronRight /></Button><h2 className="ml-2 text-sm font-semibold sm:text-base">September 7 – 13, 2026</h2></div><div className="flex items-center gap-4 text-xs text-[#66736b]"><span className="flex items-center gap-2"><i className="size-2.5 rounded-full bg-[#3b8c61]" />Learning</span><span className="flex items-center gap-2"><i className="size-2.5 rounded-full bg-[#cbd3ce]" />Busy</span></div></div>
          <div className="overflow-x-auto"><div className="min-w-[760px]">
            <div className="grid grid-cols-[64px_repeat(7,1fr)] border-b border-[#e3e8e0]"><div />{DAYS.map((day, index) => <div key={day.name} className={`border-l border-[#e8ece6] py-3 text-center ${index === 0 ? 'bg-[#f0f7f2]' : ''}`}><p className="text-[11px] font-medium uppercase tracking-wider text-[#718077]">{day.name}</p><p className={`mx-auto mt-1 grid size-8 place-items-center rounded-full text-sm font-semibold ${index === 0 ? 'bg-[#1f6f4a] text-white' : ''}`}>{day.date}</p></div>)}</div>
            <div className="relative grid h-[660px] grid-cols-[64px_repeat(7,1fr)] bg-[linear-gradient(to_bottom,transparent_59px,#e8ece6_60px)] bg-[size:100%_60px]">
              <div className="relative">{Array.from({ length: 11 }, (_, i) => <span key={i} className="absolute right-3 -translate-y-2 text-[10px] text-[#8a968e]" style={{ top: i * 60 }}>{`${8 + i}:00`}</span>)}</div>
              {DAYS.map((day, dayIndex) => <div key={day.name} className={`relative border-l border-[#e8ece6] ${dayIndex === 0 ? 'bg-[#f0f7f2]/55' : ''}`} onDoubleClick={() => openNewBlocker(dayIndex)}>{blockers.filter((item) => item.day === dayIndex).map((item) => { const top = ((minutes(item.start) - 480) / 60) * 60; const height = Math.max(((minutes(item.end) - minutes(item.start)) / 60) * 60, 34); const content = <><span className="block truncate text-[11px] font-semibold">{item.name}</span><span className="block text-[9px] opacity-70">{formatTime(item.start)}–{formatTime(item.end)}</span></>; return item.kind === 'learning' && item.source !== 'practice' ? <button key={item.id} title="Edit learning time" onClick={() => openEditBlocker(item)} className="group absolute left-1.5 right-1.5 overflow-hidden rounded-lg border border-[#91c3a5] bg-[#dff2e5] px-2 py-1.5 text-left text-[#155838] transition hover:brightness-95" style={{ top, height }}>{content}</button> : item.source === 'practice' ? <div key={item.id} title="Practice time is updated automatically" className="absolute left-1.5 right-1.5 cursor-default overflow-hidden rounded-lg border border-[#91c3a5] bg-[#dff2e5] px-2 py-1.5 text-left text-[#155838]" style={{ top, height }}>{content}</div> : <div key={item.id} title="Imported from Google Calendar" className="absolute left-1.5 right-1.5 cursor-default overflow-hidden rounded-lg border border-[#d5dcd7] bg-[#eef1ef] px-2 py-1.5 text-left text-[#5e6962]" style={{ top, height }}>{content}</div>; })}</div>)}
            </div>
          </div></div>
        </section>
        <aside className="space-y-5">
          <section className="rounded-2xl bg-[#183e2b] p-5 text-white shadow-[0_12px_30px_rgba(24,62,43,0.16)]"><div className="mb-5 flex items-start justify-between"><div className="grid size-10 place-items-center rounded-xl bg-white/10"><Clock3 size={20} /></div><MoreHorizontal className="text-white/60" /></div><p className="text-sm text-white/70">Planned this week</p><p className="mt-1 text-4xl font-semibold tracking-[-0.04em]">{learningHours.toFixed(1)} <span className="text-xl font-normal text-white/65">hours</span></p><div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-[#e8bd78]" style={{ width: `${Math.min((learningHours / 7) * 100, 100)}%` }} /></div><p className="mt-2 text-xs text-white/60">Weekly goal: 7 hours</p></section>
          <section className="rounded-2xl border border-[#dce3d9] bg-white p-5"><div className="flex items-start gap-3"><div className="grid size-9 place-items-center rounded-lg bg-[#eef3fb] text-[#3674bb]"><Cloud size={18} /></div><div><h2 className="font-semibold">Your calendar</h2><p className="mt-0.5 text-xs leading-relaxed text-[#718077]">Bring in busy times to protect your study plan.</p></div></div><div className="mt-5 space-y-2.5">{SOURCES.map((source) => <div key={source.id} className="flex items-center gap-2"><button disabled={syncingGoogle} onClick={() => void connectGoogle()} className="flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-[#e1e6df] p-3 text-left transition hover:border-[#aac4b2] hover:bg-[#f7faf7] disabled:opacity-60"><span className="grid size-8 place-items-center rounded-lg bg-[#f0f3f1] text-xs font-bold" style={{ color: source.color }}>{source.mark}</span><span className="min-w-0 flex-1"><span className="block text-sm font-medium">{source.label}</span><span className="block truncate text-[11px] text-[#7b8780]">{syncingGoogle ? 'Importing busy times…' : source.detail}</span></span><Plus size={15} className="text-[#829087]" /></button><Button variant="outline" size="icon" disabled={syncingGoogle} onClick={() => void refreshGoogleCalendar()} aria-label="Refresh Google Calendar" title="Refresh Google Calendar" className="size-12 shrink-0 rounded-xl"><RefreshCw className={syncingGoogle ? 'animate-spin' : ''} /></Button></div>)}</div>{calendarNotice && <p className="mt-3 rounded-lg bg-[#f3f8f4] p-3 text-xs leading-relaxed text-[#42604d]">{calendarNotice}</p>}</section>
          <section className="rounded-2xl border border-[#eadfc7] bg-[#fffaf0] p-4"><p className="text-xs font-semibold text-[#7b5a20]">Planning tip</p><p className="mt-1 text-xs leading-relaxed text-[#806c49]">Short, repeatable sessions beat the occasional marathon. Try 30 minutes at the same time each day.</p></section>
        </aside>
      </div>
    </section>
    <footer className="mx-auto flex max-w-[1500px] items-center justify-between px-5 pb-6 text-[11px] text-[#87928a] md:px-8"><span>{user ? 'Synced with your Lernzeit account' : 'Saved on this device'}</span><span>Version {APP_VERSION}</span></footer>
    <Dialog open={authOpen} onOpenChange={setAuthOpen}><DialogContent className="max-w-md rounded-2xl p-5"><DialogHeader><DialogTitle className="text-xl">{authMode === 'signin' ? 'Welcome back' : 'Create your Lernzeit account'}</DialogTitle><DialogDescription>Sign in to keep your learning plan safely synced across devices.</DialogDescription></DialogHeader><div className="space-y-4 py-2"><label className="block text-sm font-medium">Email<Input className="mt-2 h-10" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" /></label><label className="block text-sm font-medium">Password<Input className="mt-2 h-10" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={authMode === 'signin' ? 'current-password' : 'new-password'} /></label>{authMessage && <p className="rounded-lg bg-[#f4f7f3] p-3 text-xs text-[#526158]">{authMessage}</p>}<button className="text-xs font-medium text-[#1f6f4a] underline-offset-4 hover:underline" onClick={() => { setAuthMode(authMode === 'signin' ? 'signup' : 'signin'); setAuthMessage(''); }}>{authMode === 'signin' ? 'New here? Create an account' : 'Already have an account? Sign in'}</button></div><DialogFooter className="-mx-5 -mb-5 px-5"><Button variant="outline" onClick={() => setAuthOpen(false)}>Cancel</Button><Button disabled={authBusy || !email || password.length < 6} onClick={() => void submitAuth()} className="bg-[#1f6f4a] hover:bg-[#185c3d]">{authBusy ? 'Please wait…' : authMode === 'signin' ? 'Sign in' : 'Create account'}</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={addOpen} onOpenChange={(open) => { setAddOpen(open); if (!open) setEditingBlocker(null); }}><DialogContent className="max-w-md rounded-2xl p-5"><DialogHeader><DialogTitle className="text-xl">{editingBlocker ? 'Edit learning time' : 'Add learning time'}</DialogTitle><DialogDescription>{editingBlocker ? 'Update this session or remove it from your plan.' : 'Protect a little time for focused German practice.'}</DialogDescription></DialogHeader><div className="space-y-4 py-2"><label className="block text-sm font-medium">Name<Input className="mt-2 h-10" value={name} onChange={(event) => setName(event.target.value)} /></label><label className="block text-sm font-medium">Day<select className="mt-2 h-10 w-full rounded-lg border border-input bg-white px-3 text-sm" value={selectedDay} onChange={(event) => setSelectedDay(Number(event.target.value))}>{DAYS.map((day, index) => <option key={day.name} value={index}>{day.name}, September {day.date}</option>)}</select></label><div className="grid grid-cols-2 gap-3"><label className="block text-sm font-medium">Starts<Input className="mt-2 h-10" type="time" value={start} onChange={(event) => setStart(event.target.value)} /></label><label className="block text-sm font-medium">Ends<Input className="mt-2 h-10" type="time" value={end} onChange={(event) => setEnd(event.target.value)} /></label></div>{notice && <p className="text-xs text-red-600">{notice}</p>}</div><DialogFooter className="-mx-5 -mb-5 justify-between px-5 sm:justify-between">{editingBlocker ? <Button variant="outline" className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => { void removeBlocker(editingBlocker); setAddOpen(false); setEditingBlocker(null); }}><Trash2 />Delete</Button> : <span />}<div className="flex gap-2"><Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button><Button onClick={() => void addBlocker()} className="bg-[#1f6f4a] hover:bg-[#185c3d]"><Check />{editingBlocker ? 'Save changes' : 'Add to plan'}</Button></div></DialogFooter></DialogContent></Dialog>
    <Dialog open={connectOpen} onOpenChange={setConnectOpen}><DialogContent className="max-w-md rounded-2xl p-5"><DialogHeader><DialogTitle className="text-xl">Coming next</DialogTitle><DialogDescription>Google Calendar is ready. Outlook and Apple Calendar connections are the next integrations.</DialogDescription></DialogHeader><div className="rounded-xl border border-[#dfe7df] bg-[#f3f8f4] p-4 text-sm text-[#42604d]">Outlook will use secure Microsoft sign-in. Apple Calendar will support an iCalendar (.ics) feed or file.</div><DialogFooter className="-mx-5 -mb-5 px-5"><Button onClick={() => setConnectOpen(false)} className="bg-[#1f6f4a] hover:bg-[#185c3d]">Got it</Button></DialogFooter></DialogContent></Dialog>
  </main>;
}
