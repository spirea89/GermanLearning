'use client';
export const dynamic = 'force-static';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import {
  ArrowLeft,
  CalendarDays,
  Check,
  Clock3,
  Copy,
  Crown,
  LogIn,
  Play,
  Plus,
  Settings,
  Swords,
  Trash2,
  Trophy,
  Users,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { GERMANY_STATES } from '@/lib/germany-state-map';
import { VIENNA_DISTRICTS } from '@/lib/vienna-district-map';

const APP_VERSION = '0.25.0',
  STORAGE = 'lernzeit-active-contest';
type MapType = 'germany' | 'vienna';
type StartMode = 'now' | 'later';
type Contest = {
  id: string;
  join_code: string;
  organizer_id: string;
  level: string;
  question_count: number;
  response_time_seconds: number;
  scheduled_for: string;
  started_at: string | null;
  visibility: 'private' | 'open';
  status: 'lobby' | 'active' | 'finished';
  map_type: MapType;
};
type Player = {
  id: string;
  user_id: string;
  display_name: string;
  score: number;
  answered_count: number;
  question_started_at: string | null;
  regions_won: number;
  correct_response_ms: number;
};
type QuestionData = {
  game: string;
  title: string;
  prompt: string;
  focus: string;
  translation: string;
  answer_labels: string[];
};
type Question = { id: string; position: number; question: QuestionData };
type Feedback = {
  correct: boolean;
  expected: string[];
  timed_out?: boolean;
  position: number;
};
type RegionAward = {
  id: string;
  position: number;
  region: string | null;
  winner_user_id: string | null;
  winner_name: string | null;
  response_ms: number | null;
};
type OpenBattle = {
  id: string;
  level: string;
  question_count: number;
  response_time_seconds: number;
  scheduled_for: string;
  map_type: MapType;
  organizer_name: string;
  player_count: number;
  created_at: string;
  is_organizer: boolean;
};
type CatalogGame = {
  game_key: string;
  title: string;
  category: string;
  levels: string[];
};
function dateInput(days = 0) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
function scheduledLabel(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Vienna',
  }).format(new Date(value));
}

export default function ContestPage() {
  const [user, setUser] = useState<User | null>(null),
    [contestId, setContestId] = useState<string | null>(null),
    [contest, setContest] = useState<Contest | null>(null),
    [players, setPlayers] = useState<Player[]>([]),
    [questions, setQuestions] = useState<Question[]>([]),
    [awards, setAwards] = useState<RegionAward[]>([]),
    [openBattles, setOpenBattles] = useState<OpenBattle[]>([]),
    [catalogGames, setCatalogGames] = useState<CatalogGame[]>([]),
    [selectedGameKeys, setSelectedGameKeys] = useState<string[]>([]),
    [name, setName] = useState(''),
    [code, setCode] = useState(''),
    [level, setLevel] = useState('B1'),
    [mapType, setMapType] = useState<MapType>('germany'),
    [startMode, setStartMode] = useState<StartMode>('now'),
    [responseTime, setResponseTime] = useState(60),
    [battleDate, setBattleDate] = useState(() => dateInput(1)),
    [battleTime, setBattleTime] = useState('18:00'),
    [visibility, setVisibility] = useState<'private' | 'open'>('private'),
    [answers, setAnswers] = useState<string[]>(['']),
    [feedback, setFeedback] = useState<Feedback | null>(null),
    [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false),
    [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const me = players.find((p) => p.user_id === user?.id),
    current = me
      ? questions.find((q) => q.position === me.answered_count + 1)
      : undefined,
    isOrganizer = contest?.organizer_id === user?.id;
  const load = useCallback(async (id: string) => {
    const [c, p, q, a] = await Promise.all([
      supabase.from('contests').select('*').eq('id', id).single(),
      supabase
        .from('contest_players')
        .select('*')
        .eq('contest_id', id)
        .order('regions_won', { ascending: false })
        .order('correct_response_ms', { ascending: true }),
      supabase
        .from('contest_questions')
        .select('id,contest_id,position,question')
        .eq('contest_id', id)
        .order('position'),
      supabase
        .from('contest_region_awards')
        .select('*')
        .eq('contest_id', id)
        .order('position'),
    ]);
    if (c.error) {
      setMessage(c.error.message);
      return;
    }
    setContest(c.data as Contest);
    setPlayers((p.data ?? []) as Player[]);
    setQuestions((q.data ?? []) as Question[]);
    setAwards((a.data ?? []) as RegionAward[]);
  }, []);
  const browse = useCallback(async () => {
    const { data } = await supabase.rpc('browse_open_contests');
    setOpenBattles((data ?? []) as OpenBattle[]);
  }, []);
  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      if (data.user) {
        setName(
          data.user.user_metadata?.full_name ||
            data.user.email?.split('@')[0] ||
            'Player',
        );
        const saved = localStorage.getItem(STORAGE);
        if (saved) {
          setContestId(saved);
          void load(saved);
        }
      }
    });
    const { data } = supabase.auth.onAuthStateChange((_e, s) =>
      setUser(s?.user ?? null),
    );
    return () => data.subscription.unsubscribe();
  }, [load]);
  useEffect(() => {
    if (!contestId) return;
    const timer = window.setInterval(() => void load(contestId), 1500);
    return () => clearInterval(timer);
  }, [contestId, load]);
  useEffect(() => {
    if (!user || contestId) return;
    void browse();
    const timer = window.setInterval(() => void browse(), 3000);
    return () => clearInterval(timer);
  }, [user, contestId, browse]);
  useEffect(() => {
    void supabase
      .from('practice_games')
      .select('game_key,title,category,levels')
      .eq('active', true)
      .order('sort_order')
      .then(({ data }) => {
        const available = ((data ?? []) as CatalogGame[]).filter((game) =>
          game.levels.includes(level),
        );
        setCatalogGames(available);
        setSelectedGameKeys((current) => {
          const kept = current.filter((key) =>
            available.some((game) => game.game_key === key),
          );
          return kept.length ? kept : available.map((game) => game.game_key);
        });
      });
  }, [level]);
  useEffect(() => {
    if (current)
      setAnswers(Array(current.question.answer_labels.length).fill(''));
  }, [current?.id]);
  async function submitAuth() {
    setBusy(true);
    setMessage('');
    const result =
      authMode === 'signup'
        ? await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: 'https://spirea89.github.io/GermanLearning/',
            },
          })
        : await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (result.error) setMessage(result.error.message);
    else if (authMode === 'signup' && !result.data.session)
      setMessage(
        'Account created. Check your email to confirm your address, then sign in.',
      );
  }
  async function create() {
    setBusy(true);
    setMessage('');
    try {
      const scheduledFor =
        startMode === 'now'
          ? new Date().toISOString()
          : new Date(`${battleDate}T${battleTime}:00`).toISOString();
      const rpc =
        visibility === 'open' ? 'create_open_contest' : 'create_contest';
      const { data, error } = await supabase.rpc(rpc, {
        p_level: level,
        p_question_count: mapType === 'vienna' ? 23 : 16,
        p_display_name: name,
        p_response_time_seconds: responseTime,
        p_scheduled_for: scheduledFor,
        p_game_keys: selectedGameKeys,
        p_map_type: mapType,
      });
      if (error) throw error;
      const id = (data as { id?: string } | null)?.id;
      if (!id)
        throw new Error('The contest was not created. Please try again.');
      localStorage.setItem(STORAGE, id);
      setContestId(id);
      await load(id);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'The contest could not be created.',
      );
    } finally {
      setBusy(false);
    }
  }
  async function join() {
    setBusy(true);
    setMessage('');
    const { data, error } = await supabase.rpc('join_contest', {
      p_join_code: code.toUpperCase(),
      p_display_name: name,
    });
    setBusy(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    const id = data as string;
    localStorage.setItem(STORAGE, id);
    setContestId(id);
    await load(id);
  }
  async function joinOpen(id: string) {
    setBusy(true);
    setMessage('');
    const { data, error } = await supabase.rpc('join_open_contest', {
      p_contest_id: id,
      p_display_name: name,
    });
    setBusy(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    const joined = data as string;
    localStorage.setItem(STORAGE, joined);
    setContestId(joined);
    await load(joined);
  }
  async function manageOpen(id: string) {
    setBusy(true);
    setMessage('');
    localStorage.setItem(STORAGE, id);
    setContestId(id);
    await load(id);
    setBusy(false);
  }
  async function start() {
    if (!contest) return;
    setBusy(true);
    const { error } = await supabase.rpc('start_contest', {
      p_contest_id: contest.id,
    });
    setBusy(false);
    if (error) setMessage(error.message);
    else await load(contest.id);
  }
  async function deleteBattle() {
    if (
      !contest ||
      !window.confirm(
        'Delete this battle? It will also be removed from your Learning Plan.',
      )
    )
      return;
    setBusy(true);
    setMessage('');
    const { error } = await supabase.rpc('delete_contest', {
      p_contest_id: contest.id,
    });
    setBusy(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    leave();
  }
  async function submit(timedOut = false) {
    if (!contest || !current || (!timedOut && answers.some((a) => !a.trim())))
      return;
    setBusy(true);
    const response = timedOut
      ? Array(current.question.answer_labels.length).fill('')
      : answers;
    const { data, error } = await supabase.rpc('submit_contest_answer', {
      p_contest_id: contest.id,
      p_position: current.position,
      p_response: response,
    });
    if (error) {
      setBusy(false);
      setMessage(error.message);
      return;
    }
    setBusy(false);
    setFeedback(data as Feedback);
    await load(contest.id);
  }
  function next() {
    setFeedback(null);
    if (contestId) void load(contestId);
  }
  function leave() {
    localStorage.removeItem(STORAGE);
    setContestId(null);
    setContest(null);
    setPlayers([]);
    setQuestions([]);
    setAwards([]);
    setFeedback(null);
  }
  if (!user)
    return (
      <Shell>
        <div className="mx-auto mt-8 max-w-md rounded-3xl border bg-white p-5 shadow-sm sm:mt-16 sm:p-7">
          <span className="grid size-12 place-items-center rounded-2xl bg-[#ece9fb] text-[#5b45a1]">
            <Swords />
          </span>
          <h1 className="mt-5 text-3xl font-semibold">
            {authMode === 'signup' ? 'Create your account' : 'Join the battle'}
          </h1>
          <p className="mt-2 text-sm text-[#718077]">
            {authMode === 'signup'
              ? 'Create an account to join battles and save your progress.'
              : 'Sign in so your score and identity are protected.'}
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void submitAuth();
            }}
            className="mt-6 space-y-3"
          >
            <Input
              type="email"
              aria-label="Email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
            <Input
              type="password"
              aria-label="Password"
              placeholder="Password (6 characters minimum)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={
                authMode === 'signup' ? 'new-password' : 'current-password'
              }
            />
            <Button
              type="submit"
              className="w-full bg-[#5b45a1]"
              disabled={busy || !email || password.length < 6}
            >
              <LogIn />
              {busy
                ? 'Please wait…'
                : authMode === 'signup'
                  ? 'Create account'
                  : 'Sign in'}
            </Button>
            {message && (
              <p role="status" className="text-sm text-red-600">
                {message}
              </p>
            )}
            <button
              type="button"
              onClick={() => {
                setAuthMode(authMode === 'signup' ? 'signin' : 'signup');
                setMessage('');
              }}
              className="block w-full py-2 text-center text-sm font-medium underline underline-offset-4"
            >
              {authMode === 'signup'
                ? 'Already have an account? Sign in'
                : 'New here? Create an account'}
            </button>
          </form>
        </div>
      </Shell>
    );
  if (!contest)
    return (
      <Shell>
        <section className="mx-auto max-w-5xl px-5 py-10">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[.18em] text-[#6b55ad]">
              Multiplayer
            </p>
            <h1 className="mt-2 text-4xl font-semibold">German Battle</h1>
            <p className="mt-2 text-[#718077]">
              Create a private room or open your lobby to every learner online.
            </p>
          </div>
          <div className="mt-9 grid gap-6 md:grid-cols-2">
            <Card icon={<Plus />} title="Create a contest">
              <Field label="Your player name">
                <Input
                  maxLength={30}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Language level">
                  <select
                    className="h-10 w-full rounded-md border bg-white px-3"
                    value={level}
                    onChange={(e) => {
                      setLevel(e.target.value);
                      setCatalogGames([]);
                      setSelectedGameKeys([]);
                    }}
                  >
                    {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Battle map">
                  <select
                    className="h-10 w-full rounded-md border bg-white px-3"
                    value={mapType}
                    onChange={(e) => setMapType(e.target.value as MapType)}
                  >
                    <option value="germany">Germany · 16 states</option>
                    <option value="vienna">Vienna · 23 districts</option>
                  </select>
                </Field>
              </div>
              <Field label="When should the battle start?">
                <div className="grid grid-cols-2 gap-2">
                  {(['now', 'later'] as const).map((value) => (
                    <button
                      type="button"
                      key={value}
                      aria-pressed={startMode === value}
                      onClick={() => setStartMode(value)}
                      className={`battle-visibility-option rounded-xl border p-3 text-left text-sm ${startMode === value ? 'is-selected' : ''}`}
                    >
                      <strong className="block">
                        {value === 'now' ? 'Start now' : 'Start later'}
                      </strong>
                      <span className="text-xs">
                        {value === 'now'
                          ? 'Start button available immediately'
                          : 'Schedule a day and time'}
                      </span>
                    </button>
                  ))}
                </div>
              </Field>
              {startMode === 'later' && (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Battle day">
                    <Input
                      type="date"
                      min={dateInput()}
                      value={battleDate}
                      onChange={(e) => setBattleDate(e.target.value)}
                    />
                  </Field>
                  <Field label="Start time">
                    <Input
                      type="time"
                      value={battleTime}
                      onChange={(e) => setBattleTime(e.target.value)}
                    />
                  </Field>
                </div>
              )}
              <Field label="Time per question">
                <select
                  className="h-10 w-full rounded-md border bg-white px-3"
                  value={responseTime}
                  onChange={(e) => setResponseTime(Number(e.target.value))}
                >
                  {Array.from({ length: 12 }, (_, i) => (i + 1) * 10).map(
                    (v) => (
                      <option key={v} value={v}>
                        {v} seconds{v === 60 ? ' · Default' : ''}
                      </option>
                    ),
                  )}
                </select>
              </Field>
              <Field label={`Games for ${level}`}>
                <div className="mt-2 grid gap-2">
                  {catalogGames.length ? (
                    catalogGames.map((game) => {
                      const selected = selectedGameKeys.includes(game.game_key);
                      return (
                        <button
                          type="button"
                          key={game.game_key}
                          aria-pressed={selected}
                          onClick={() =>
                            setSelectedGameKeys((current) =>
                              selected
                                ? current.filter((key) => key !== game.game_key)
                                : [...current, game.game_key],
                            )
                          }
                          className={`battle-game-option rounded-xl border px-3 py-2 text-left ${selected ? 'is-selected' : ''}`}
                        >
                          <span className="block text-sm font-semibold">
                            {game.title}
                          </span>
                          <span className="text-xs opacity-70">
                            {game.category}
                          </span>
                        </button>
                      );
                    })
                  ) : (
                    <p className="rounded-xl border border-dashed p-3 text-xs text-[#718077]">
                      No games are enabled for {level}. Configure game levels in
                      Administration.
                    </p>
                  )}
                </div>
              </Field>
              <Field label="Battle visibility">
                <div className="grid grid-cols-2 gap-2">
                  {(['private', 'open'] as const).map((value) => (
                    <button
                      type="button"
                      key={value}
                      aria-pressed={visibility === value}
                      onClick={() => setVisibility(value)}
                      className={`battle-visibility-option rounded-xl border p-3 text-left text-sm ${visibility === value ? 'is-selected' : ''}`}
                    >
                      <strong className="block capitalize">{value}</strong>
                      <span className="text-xs">
                        {value === 'private'
                          ? 'Join code only'
                          : 'Listed for everyone'}
                      </span>
                    </button>
                  ))}
                </div>
              </Field>
              <Button
                disabled={
                  busy ||
                  !name.trim() ||
                  (startMode === 'later' && (!battleDate || !battleTime)) ||
                  !selectedGameKeys.length
                }
                onClick={() => void create()}
                className="w-full bg-[#5b45a1]"
              >
                {busy ? 'Creating…' : 'Create battle'}
              </Button>
            </Card>
            <Card icon={<Users />} title="Join a private battle">
              <Field label="Your player name">
                <Input
                  maxLength={30}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </Field>
              <Field label="6-character battle code">
                <Input
                  maxLength={6}
                  className="text-center text-xl font-bold uppercase tracking-[.3em]"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                />
              </Field>
              <Button
                disabled={busy || code.length !== 6 || !name.trim()}
                onClick={() => void join()}
                className="w-full bg-[#173f2b]"
              >
                Join private battle
              </Button>
            </Card>
          </div>
          <section className="mt-10">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[.16em] text-[#6b55ad]">
                  Open lobbies
                </p>
                <h2 className="mt-1 text-2xl font-semibold">
                  Scheduled battles
                </h2>
              </div>
              <span className="text-xs text-[#87928a]">
                Updates automatically
              </span>
            </div>
            {openBattles.length ? (
              <div className="mt-4 grid gap-3">
                {openBattles.map((battle) => (
                  <article
                    key={battle.id}
                    className="flex flex-col justify-between gap-4 rounded-2xl border bg-white p-4 sm:flex-row sm:items-center"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-[#ece9fb] px-2.5 py-1 text-xs font-bold text-[#5b45a1]">
                          {battle.level}
                        </span>
                        <strong>{battle.organizer_name}&apos;s battle</strong>
                        {battle.is_organizer && (
                          <span className="rounded-full bg-[#e7f4eb] px-2.5 py-1 text-xs font-semibold text-[#257049]">
                            Your battle
                          </span>
                        )}
                      </div>
                      <p className="mt-2 flex flex-wrap items-center gap-x-2 text-sm text-[#718077]">
                        <span className="inline-flex items-center gap-1 font-semibold">
                          <CalendarDays size={14} />
                          {scheduledLabel(battle.scheduled_for)}
                        </span>
                        <span>
                          ·{' '}
                          {battle.map_type === 'vienna' ? 'Vienna' : 'Germany'}{' '}
                          map · {battle.question_count} questions ·{' '}
                          {battle.response_time_seconds}s each ·{' '}
                          {battle.player_count}/10 players
                        </span>
                      </p>
                    </div>
                    {battle.is_organizer ? (
                      <Button
                        disabled={busy}
                        onClick={() => void manageOpen(battle.id)}
                        className="bg-[#173f2b]"
                      >
                        <Settings />
                        Manage battle
                      </Button>
                    ) : (
                      <Button
                        disabled={busy || !name.trim()}
                        onClick={() => void joinOpen(battle.id)}
                        className="bg-[#5b45a1]"
                      >
                        Join &amp; add to calendar
                      </Button>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-dashed bg-white/60 p-8 text-center text-sm text-[#718077]">
                No open battles are scheduled right now. Create the first one!
              </div>
            )}
          </section>
          {message && (
            <p className="mx-auto mt-5 max-w-xl rounded-xl bg-red-50 p-3 text-center text-sm text-red-600">
              {message}
            </p>
          )}
        </section>
      </Shell>
    );
  return (
    <Shell>
      <section className="mx-auto max-w-6xl px-5 py-8">
        <button
          onClick={leave}
          className="flex items-center gap-2 text-sm text-[#718077]"
        >
          <ArrowLeft size={16} />
          Leave battle
        </button>
        {contest.status === 'lobby' ? (
          <Lobby
            contest={contest}
            players={players}
            organizer={isOrganizer}
            busy={busy}
            start={start}
            deleteBattle={deleteBattle}
          />
        ) : (
          <Battle
            contest={contest}
            players={players}
            questions={questions}
            awards={awards}
            me={me}
            current={current}
            answers={answers}
            setAnswers={setAnswers}
            feedback={feedback}
            submit={submit}
            next={next}
            busy={busy}
          />
        )}{' '}
        {message && (
          <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-600">
            {message}
          </p>
        )}
      </section>
    </Shell>
  );
}
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#f6f5fa] text-[#17221b]">
      <header className="border-b bg-white px-5 py-3">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <a href="./" className="font-semibold">
            Lernzeit
          </a>
          <span className="flex items-center gap-2 font-semibold text-[#5b45a1]">
            <Swords size={18} />
            German Battle
          </span>
        </div>
      </header>
      {children}
      <footer className="mx-auto max-w-6xl px-5 py-6 text-right text-[11px] text-[#87928a]">
        Version {APP_VERSION}
      </footer>
    </main>
  );
}
function Card({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <article className="rounded-3xl border bg-white p-6 shadow-sm">
      <span className="grid size-11 place-items-center rounded-xl bg-[#ece9fb] text-[#5b45a1]">
        {icon}
      </span>
      <h2 className="mt-4 text-2xl font-semibold">{title}</h2>
      <div className="mt-5 space-y-4">{children}</div>
    </article>
  );
}
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}
function Lobby({
  contest,
  players,
  organizer,
  busy,
  start,
  deleteBattle,
}: {
  contest: Contest;
  players: Player[];
  organizer: boolean;
  busy: boolean;
  start: () => Promise<void>;
  deleteBattle: () => Promise<void>;
}) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const ready = now >= new Date(contest.scheduled_for).getTime(),
    canDelete = players.length <= 1;
  return (
    <div className="mx-auto mt-8 max-w-3xl text-center">
      <p className="text-xs font-semibold uppercase tracking-[.16em] text-[#6b55ad]">
        Waiting room · {contest.level} ·{' '}
        {contest.map_type === 'vienna' ? 'Vienna' : 'Germany'} map ·{' '}
        {contest.question_count} questions · {contest.response_time_seconds}s
        each
      </p>
      <h1 className="mt-3 text-3xl font-semibold">Invite your opponents</h1>
      <p className="mx-auto mt-4 inline-flex items-center gap-2 rounded-full bg-[#ece9fb] px-4 py-2 text-sm font-semibold text-[#5b45a1]">
        <CalendarDays size={16} />
        {scheduledLabel(contest.scheduled_for)}
      </p>
      <button
        onClick={() => void navigator.clipboard.writeText(contest.join_code)}
        className="mx-auto mt-5 flex items-center gap-3 rounded-2xl border bg-white px-6 py-4 text-3xl font-bold tracking-[.28em] text-[#5b45a1]"
      >
        {contest.join_code}
        <Copy size={18} />
      </button>
      <p className="mt-2 text-xs text-[#718077]">
        Share this code · {players.length}/10 players · Added to every
        player&apos;s Learning Plan
      </p>
      <Leaderboard players={players} />
      {organizer ? (
        <>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button
              disabled={busy || !players.length || !ready}
              onClick={() => void start()}
              className="bg-[#5b45a1]"
            >
              <Play />
              {ready ? 'Start contest' : 'Waiting for scheduled time'}
            </Button>
            <Button
              variant="outline"
              disabled={busy || !canDelete}
              onClick={() => void deleteBattle()}
              className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              <Trash2 />
              Delete battle
            </Button>
          </div>
          {!ready && (
            <p className="mt-2 text-xs text-[#718077]">
              The start button unlocks at the scheduled time.
            </p>
          )}
          {!canDelete && (
            <p className="mt-2 text-xs text-[#718077]">
              Deletion is locked because another player has joined.
            </p>
          )}
        </>
      ) : (
        <p className="mt-6 text-sm text-[#718077]">
          The organizer can start the contest at the scheduled time.
        </p>
      )}
    </div>
  );
}
function Battle({
  contest,
  players,
  questions,
  awards,
  me,
  current,
  answers,
  setAnswers,
  feedback,
  submit,
  next,
  busy,
}: {
  contest: Contest;
  players: Player[];
  questions: Question[];
  awards: RegionAward[];
  me?: Player;
  current?: Question;
  answers: string[];
  setAnswers: (v: string[]) => void;
  feedback: Feedback | null;
  submit: (timedOut?: boolean) => Promise<void>;
  next: () => void;
  busy: boolean;
}) {
  const [remaining, setRemaining] = useState(contest.response_time_seconds);
  const shown = feedback
    ? questions.find((question) => question.position === feedback.position)
    : current;
  const roundAward = feedback
    ? awards.find((award) => award.position === feedback.position)
    : undefined;
  useEffect(() => {
    if (!current || !me?.question_started_at || feedback) return;
    const deadline =
      new Date(me.question_started_at).getTime() +
      contest.response_time_seconds * 1000;
    const update = () =>
      setRemaining(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    update();
    const timer = window.setInterval(update, 250);
    return () => window.clearInterval(timer);
  }, [
    current?.id,
    me?.question_started_at,
    contest.response_time_seconds,
    feedback,
  ]);
  useEffect(() => {
    if (current && remaining === 0 && !feedback && !busy) void submit(true);
  }, [remaining, current?.id, feedback, busy, submit]);
  const finished = !current || contest.status === 'finished',
    urgent = remaining <= 10;
  return (
    <>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        <article className="rounded-3xl border bg-white p-6 sm:p-8">
          {finished && !feedback ? (
            <div className="py-14 text-center">
              <Trophy className="mx-auto text-[#d09a3a]" size={48} />
              <h1 className="mt-4 text-3xl font-semibold">
                {contest.status === 'finished'
                  ? 'Battle finished!'
                  : 'You finished!'}
              </h1>
              <p className="mt-2 text-[#718077]">
                You conquered {me?.regions_won ?? 0} of{' '}
                {contest.map_type === 'vienna'
                  ? "Vienna's 23 districts"
                  : "Germany's 16 states"}
                .
              </p>
            </div>
          ) : (
            shown && (
              <>
                <div className="flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-wider text-[#6b55ad]">
                  <span>{shown.question.title}</span>
                  <span className="flex items-center gap-3">
                    {!feedback && (
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-bold normal-case tracking-normal ${urgent ? 'bg-red-50 text-red-700' : 'bg-[#ece9fb] text-[#5b45a1]'}`}
                      >
                        <Clock3 size={15} />
                        {remaining}s
                      </span>
                    )}
                    <span>
                      {shown.position}/{contest.question_count}
                    </span>
                  </span>
                </div>
                {!feedback && (
                  <>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#ece9fb]">
                      <div
                        className={`h-full rounded-full transition-[width] ${urgent ? 'bg-red-500' : 'bg-[#6b55ad]'}`}
                        style={{
                          width: `${(remaining / contest.response_time_seconds) * 100}%`,
                        }}
                      />
                    </div>
                    <p className="mt-8 text-3xl font-medium">
                      {shown.question.game === 'prepositions'
                        ? shown.question.prompt.replace('?', '………………')
                        : shown.question.prompt}
                    </p>
                    <p className="mt-3 text-sm font-medium text-[#5b45a1]">
                      {shown.question.focus}
                    </p>
                    <p className="mt-2 text-sm text-[#718077]">
                      {shown.question.translation}
                    </p>
                  </>
                )}
                <div className="mt-8 space-y-3">
                  {!feedback &&
                    shown.question.answer_labels.map((label, i) => (
                      <Field key={label} label={label}>
                        <Input
                          disabled={busy}
                          value={answers[i] ?? ''}
                          onChange={(e) => {
                            const next = [...answers];
                            next[i] = e.target.value;
                            setAnswers(next);
                          }}
                        />
                      </Field>
                    ))}
                  {feedback ? (
                    <div className="space-y-3">
                      <div
                        className={`rounded-xl p-4 ${feedback.correct ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}
                      >
                        <p className="flex items-center gap-2 font-semibold">
                          {feedback.correct ? <Check /> : <X />}
                          {feedback.correct
                            ? 'Correct answer!'
                            : feedback.timed_out
                              ? 'Time is up!'
                              : 'Incorrect answer.'}
                        </p>
                        {!feedback.correct &&
                          feedback.expected.map((a, i) => (
                            <p key={a} className="mt-1 text-sm">
                              {shown.question.answer_labels[i]}: {a}
                            </p>
                          ))}
                      </div>
                      {roundAward ? (
                        <div className="rounded-2xl border-2 border-[#f0c75e] bg-[#fff9e7] p-5 text-center text-[#4d3911]">
                          {roundAward.winner_name ? (
                            <>
                              <Crown className="mx-auto text-[#d09a3a]" />
                              <p className="mt-2 text-xs font-bold uppercase tracking-wider">
                                Fastest correct answer
                              </p>
                              <p className="mt-1 text-xl font-bold">
                                {roundAward.winner_name}
                              </p>
                              <p className="mt-1 text-sm">
                                conquered <strong>{roundAward.region}</strong>{' '}
                                in{' '}
                                {((roundAward.response_ms ?? 0) / 1000).toFixed(
                                  2,
                                )}
                                s
                              </p>
                            </>
                          ) : (
                            <>
                              <X className="mx-auto" />
                              <p className="mt-2 font-bold">
                                No region conquered
                              </p>
                              <p className="text-sm">
                                Nobody answered correctly this round.
                              </p>
                            </>
                          )}
                          <Button onClick={next} className="mt-4 bg-[#5b45a1]">
                            {contest.status === 'finished'
                              ? 'See final map'
                              : 'Next question'}
                          </Button>
                        </div>
                      ) : (
                        <div className="rounded-xl bg-[#f7f6fb] p-4 text-center text-sm text-[#718077]">
                          Waiting for the other players to finish this question…
                        </div>
                      )}
                    </div>
                  ) : (
                    <Button
                      disabled={busy || answers.some((a) => !a.trim())}
                      onClick={() => void submit()}
                      className="w-full bg-[#5b45a1]"
                    >
                      Submit answer
                    </Button>
                  )}
                </div>
              </>
            )
          )}
        </article>
        <div>
          <TerritoryMap mapType={contest.map_type} awards={awards} />
          <Leaderboard players={players} />
        </div>
      </div>
    </>
  );
}
function TerritoryMap({
  mapType,
  awards,
}: {
  mapType: MapType;
  awards: RegionAward[];
}) {
  return mapType === 'vienna' ? (
    <ViennaMap awards={awards} />
  ) : (
    <GermanyMap awards={awards} />
  );
}
const PLAYER_COLORS = [
  '#f4b942',
  '#ef6f6c',
  '#6c8eef',
  '#65c18c',
  '#b77de0',
  '#ef8f45',
  '#50b9c7',
  '#d66a9f',
  '#8cab4a',
  '#8172c6',
];
function playerColor(value: string | null) {
  let hash = 0;
  for (const char of value ?? '') hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return PLAYER_COLORS[Math.abs(hash) % PLAYER_COLORS.length];
}
function GermanyMap({ awards }: { awards: RegionAward[] }) {
  return (
    <aside className="rounded-3xl border bg-white p-5">
      <h2 className="flex items-center gap-2 font-semibold">
        <Swords size={18} className="text-[#6b55ad]" />
        Germany conquered
      </h2>
      <p className="mt-1 text-xs text-[#718077]">
        The fastest correct answer claims a real federal state.
      </p>
      <svg
        className="vienna-district-map germany-state-map mt-4"
        viewBox="0 0 700 900"
        role="img"
        aria-label="Map of Germany's 16 federal states"
      >
        {GERMANY_STATES.map((state) => {
          const award = awards.find((item) => item.region === state.name),
            winner = award?.winner_name ?? null;
          return (
            <g key={state.code} className={award ? 'is-conquered' : ''}>
              <path
                d={state.path}
                style={
                  award
                    ? { fill: playerColor(award.winner_user_id) }
                    : undefined
                }
              >
                <title>
                  {award
                    ? `${state.displayName} · ${winner}`
                    : state.displayName}
                </title>
              </path>
              <text
                x={state.x}
                y={state.y - (winner ? 7 : 0)}
                className="district-number"
              >
                {state.code}
              </text>
              {winner && (
                <text x={state.x} y={state.y + 17} className="district-winner">
                  {winner.length > 10 ? `${winner.slice(0, 9)}…` : winner}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <p className="mt-2 text-[9px] text-[#87928a]">
        Map boundaries:{' '}
        <a
          className="underline"
          href="https://www.bkg.bund.de"
          target="_blank"
          rel="noreferrer"
        >
          © BKG 2025
        </a>{' '}
        ·{' '}
        <a
          className="underline"
          href="https://www.govdata.de/dl-de/by-2-0"
          target="_blank"
          rel="noreferrer"
        >
          dl-de/by-2-0
        </a>
      </p>
    </aside>
  );
}
function ViennaMap({ awards }: { awards: RegionAward[] }) {
  return (
    <aside className="rounded-3xl border bg-white p-5">
      <h2 className="flex items-center gap-2 font-semibold">
        <Swords size={18} className="text-[#6b55ad]" />
        Vienna conquered
      </h2>
      <p className="mt-1 text-xs text-[#718077]">
        The fastest correct answer claims a real Vienna district.
      </p>
      <svg
        className="vienna-district-map mt-4"
        viewBox="0 0 1000 760"
        role="img"
        aria-label="Map of Vienna's 23 districts"
      >
        {VIENNA_DISTRICTS.map((district) => {
          const region = `${district.id}. ${district.name}`,
            award = awards.find((item) => item.region === region),
            winner = award?.winner_name ?? null;
          return (
            <g key={district.id} className={award ? 'is-conquered' : ''}>
              <path
                d={district.path}
                style={
                  award
                    ? { fill: playerColor(award.winner_user_id) }
                    : undefined
                }
              >
                <title>{award ? `${region} · ${winner}` : region}</title>
              </path>
              <text
                x={district.x}
                y={district.y - (winner ? 6 : 0)}
                className="district-number"
              >
                {district.id}
              </text>
              {winner && (
                <text
                  x={district.x}
                  y={district.y + 16}
                  className="district-winner"
                >
                  {winner.length > 10 ? `${winner.slice(0, 9)}…` : winner}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </aside>
  );
}
function Leaderboard({ players }: { players: Player[] }) {
  const ordered = useMemo(
    () =>
      [...players].sort(
        (a, b) =>
          b.regions_won - a.regions_won ||
          (a.score ? a.correct_response_ms : Number.MAX_SAFE_INTEGER) -
            (b.score ? b.correct_response_ms : Number.MAX_SAFE_INTEGER),
      ),
    [players],
  );
  return (
    <aside className="mt-6 rounded-3xl border bg-white p-5 text-left">
      <h2 className="flex items-center gap-2 font-semibold">
        <Crown size={18} className="text-[#d09a3a]" />
        Leaderboard
      </h2>
      <div className="mt-4 space-y-2">
        {ordered.map((p, i) => (
          <div
            key={p.id}
            className="flex items-center justify-between rounded-xl bg-[#f7f6fb] px-3 py-2"
          >
            <span>
              <strong className="mr-2 text-[#6b55ad]">#{i + 1}</strong>
              {p.display_name}
            </span>
            <span className="text-right font-semibold">
              {p.regions_won}{' '}
              <span className="text-xs font-normal text-[#87928a]">
                regions
                <br />
                {p.score
                  ? `${(p.correct_response_ms / 1000).toFixed(1)}s correct time`
                  : 'no correct answers'}
              </span>
            </span>
          </div>
        ))}
      </div>
    </aside>
  );
}
