'use client';

export const dynamic = 'force-static';

import { useEffect, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { ArrowLeft, ArrowRight, BookOpen, Check, Clock3, Gamepad2, Lightbulb, RotateCcw, Settings, Sparkles, Trophy, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { FALLBACK_GAME_ITEMS, normalizeAnswer, type GameItem } from '@/lib/game-content';

const APP_VERSION = '0.5.1';

function shuffleItems(current: GameItem[]) {
  const shuffled = [...current];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }
  if (shuffled.length > 1 && shuffled[0].id === current[0].id) shuffled.push(shuffled.shift()!);
  return shuffled;
}

export default function PracticePage() {
  const [items, setItems] = useState<GameItem[]>(FALLBACK_GAME_ITEMS);
  const [playing, setPlaying] = useState(false);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState<'correct' | 'wrong' | null>(null);
  const [correct, setCorrect] = useState(0);
  const [answered, setAnswered] = useState(0);
  const [user, setUser] = useState<User | null>(null);
  const [practicedSeconds, setPracticedSeconds] = useState(0);
  const lastTickRef = useRef<number | null>(null);
  const savingRef = useRef(false);
  const item = items[index % items.length];

  useEffect(() => { void supabase.from('game_content').select('*').eq('level', 'B1').eq('game_key', 'opposites').eq('active', true).order('sort_order').then(({ data }) => { if (data?.length) setItems(data as GameItem[]); }); }, []);
  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => { setUser(data.user); if (data.user) void loadTodayTotal(data.user.id); });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => { setUser(session?.user ?? null); if (session?.user) setTimeout(() => void loadTodayTotal(session.user.id), 0); });
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (!playing || !user) { lastTickRef.current = null; return; }
    lastTickRef.current = Date.now();
    const timer = window.setInterval(() => void flushPracticeTime(), 10000);
    const visibility = () => { if (document.hidden) void flushPracticeTime().then(() => { lastTickRef.current = null; }); else lastTickRef.current = Date.now(); };
    document.addEventListener('visibilitychange', visibility);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', visibility); void flushPracticeTime(); };
  }, [playing, user]);

  async function loadTodayTotal(userId: string) {
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Vienna', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    const { data } = await supabase.from('practice_daily_totals').select('total_seconds').eq('user_id', userId).eq('practice_date', today).maybeSingle();
    setPracticedSeconds(data?.total_seconds ?? 0);
  }
  async function flushPracticeTime() {
    if (!user || !lastTickRef.current || savingRef.current) return;
    const seconds = Math.floor((Date.now() - lastTickRef.current) / 1000);
    if (seconds < 1) return;
    savingRef.current = true; lastTickRef.current += seconds * 1000;
    const { data, error } = await supabase.rpc('record_practice_time', { seconds_played: seconds });
    if (!error && typeof data === 'number') setPracticedSeconds(data);
    savingRef.current = false;
  }

  function checkAnswer() {
    if (!answer.trim() || result) return;
    const isCorrect = normalizeAnswer(answer) === normalizeAnswer(item.opposite_word);
    setResult(isCorrect ? 'correct' : 'wrong'); setAnswered((value) => value + 1); if (isCorrect) setCorrect((value) => value + 1);
  }
  function next() { setIndex((value) => (value + 1) % items.length); setAnswer(''); setResult(null); }
  function start() { setItems((current) => shuffleItems(current)); setPlaying(true); setIndex(0); setAnswer(''); setResult(null); setCorrect(0); setAnswered(0); }
  async function stopPlaying() { await flushPracticeTime(); setPlaying(false); }

  return <main className="min-h-screen bg-[#f5f7f2] text-[#17221b]">
    <header className="border-b border-[#dce3d9] bg-white/90 px-5 py-3 backdrop-blur md:px-8"><div className="mx-auto flex max-w-6xl items-center justify-between">
      <a href="./" className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-xl bg-[#1f6f4a] text-white"><BookOpen size={19} /></span><span><span className="block font-semibold leading-tight">Lernzeit</span><span className="block text-[11px] text-[#718077]">German, one day at a time</span></span></a>
      <nav className="flex items-center gap-1 rounded-xl bg-[#edf3ec] p-1"><a href="./" className="hidden rounded-lg px-4 py-2 text-sm text-[#718077] sm:block">Learning plan</a><span className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium shadow-sm"><Sparkles size={16} />Practice</span></nav>
      <a href="./admin.html" aria-label="Administration" className="grid size-9 place-items-center rounded-lg text-[#718077] hover:bg-[#edf3ec]"><Settings size={18} /></a>
    </div></header>

    {!playing ? <section className="mx-auto max-w-6xl px-5 py-10 md:px-8">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#3c805d]">Practice games</p><h1 className="mt-2 text-4xl font-semibold tracking-[-0.04em]">Train what you have learned</h1><p className="mt-3 max-w-xl text-sm leading-relaxed text-[#66736b]">Short challenges organized by language level. Start with B1 vocabulary and build confidence one answer at a time.</p>
      <div className="mt-9"><div className="mb-4 flex items-center gap-3"><span className="grid size-11 place-items-center rounded-xl bg-[#183e2b] font-bold text-white">B1</span><div><h2 className="text-xl font-semibold">Intermediate</h2><p className="text-xs text-[#718077]">Vocabulary and everyday expressions</p></div></div>
        <article className="max-w-2xl overflow-hidden rounded-3xl border border-[#d8e2d8] bg-white shadow-[0_16px_45px_rgba(38,65,48,0.08)]"><div className="bg-[linear-gradient(135deg,#193f2c,#286b49)] p-7 text-white"><div className="grid size-12 place-items-center rounded-2xl bg-white/12"><Gamepad2 /></div><p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-[#b8dbc5]">Vocabulary · {items.length} exercises</p><h3 className="mt-2 text-3xl font-semibold tracking-[-0.035em]">Finden Sie das Gegenteil</h3><p className="mt-2 max-w-lg text-sm text-white/70">Read the sentence and enter the opposite of the highlighted word.</p></div><div className="flex items-center justify-between gap-4 p-5"><div className="text-sm"><span className="font-medium">Example:</span> Den Fahrstuhl <span className="rounded bg-[#e4f2e8] px-1.5 py-0.5 font-semibold text-[#1f6f4a]">betreten</span> → verlassen</div><Button onClick={start} className="rounded-xl bg-[#1f6f4a] hover:bg-[#185c3d]">Play <ArrowRight /></Button></div></article>
      </div>
    </section> : <section className="mx-auto max-w-3xl px-5 py-8 md:px-8">
      <div className="mb-5 flex items-center justify-between"><Button variant="ghost" onClick={() => void stopPlaying()}><ArrowLeft />All games</Button><div className="flex items-center gap-4 text-sm font-medium text-[#637067]"><span className="flex items-center gap-2"><Clock3 size={17} className="text-[#3b8c61]" />{user ? `${Math.floor(practicedSeconds / 60)} min today` : 'Sign in to record time'}</span><span className="flex items-center gap-2"><Trophy size={17} className="text-[#d09a3a]" />{correct} correct</span></div></div>
      <div className="mb-6 h-2 overflow-hidden rounded-full bg-[#e3e8e2]"><div className="h-full rounded-full bg-[#3b8c61] transition-all" style={{ width: `${((index + (result ? 1 : 0)) / items.length) * 100}%` }} /></div>
      <article className="rounded-3xl border border-[#dce3d9] bg-white p-6 shadow-[0_14px_45px_rgba(38,65,48,0.08)] sm:p-9"><div className="flex items-center justify-between"><span className="rounded-full bg-[#edf5ef] px-3 py-1 text-xs font-semibold text-[#28734c]">B1 · Opposites</span><span className="text-xs text-[#87928a]">{index + 1} / {items.length}</span></div><p className="mt-10 text-sm font-medium text-[#718077]">What is the opposite of the highlighted word?</p><p className="mt-3 text-3xl font-medium leading-relaxed tracking-[-0.025em]">{item.phrase_before}<span className="rounded-lg bg-[#e4f2e8] px-2 py-1 text-[#1f6f4a]">{item.target_word}</span>{item.phrase_after}</p>
        <div className="mt-9"><label className="text-sm font-medium" htmlFor="answer">Your answer</label><div className="mt-2 flex gap-2"><Input id="answer" autoFocus value={answer} disabled={!!result} onChange={(event) => setAnswer(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') result ? next() : checkAnswer(); }} placeholder="Type the opposite…" className="h-12 rounded-xl text-base" /><Button onClick={result ? next : checkAnswer} disabled={!answer.trim() && !result} className="h-12 rounded-xl bg-[#1f6f4a] px-5 hover:bg-[#185c3d]">{result ? <>Next <ArrowRight /></> : <>Check <Check /></>}</Button></div></div>
        {result && <div className={`mt-5 rounded-2xl border p-4 ${result === 'correct' ? 'border-[#b9dbc5] bg-[#eef8f1] text-[#1e6842]' : 'border-[#efc5bd] bg-[#fff3f0] text-[#9a3d30]'}`}><div className="flex gap-3">{result === 'correct' ? <Check className="mt-0.5 shrink-0" /> : <X className="mt-0.5 shrink-0" />}<div><p className="font-semibold">{result === 'correct' ? 'Richtig!' : 'Noch nicht.'}</p><p className="mt-1 text-sm">The opposite of <strong>{item.target_word}</strong> is <strong>{item.opposite_word}</strong>.</p></div></div></div>}
        {!result && item.hint && <p className="mt-5 flex items-center gap-2 text-xs text-[#7a856d]"><Lightbulb size={15} />Hint: {item.hint}</p>}
      </article>
      {answered >= items.length && <Button variant="outline" className="mx-auto mt-5 flex" onClick={start}><RotateCcw />Start again</Button>}
    </section>}
    <footer className="mx-auto flex max-w-6xl justify-end px-5 pb-6 text-[11px] text-[#87928a] md:px-8">Version {APP_VERSION}</footer>
  </main>;
}
