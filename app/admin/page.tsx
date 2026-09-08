'use client';

export const dynamic = 'force-static';

import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { ArrowLeft, BookOpen, Check, LogIn, Pencil, Plus, Save, ShieldCheck, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import type { GameItem } from '@/lib/game-content';

const APP_VERSION = '0.4.0';
const EMPTY_FORM = { phrase_before: '', target_word: '', phrase_after: '', opposite_word: '', hint: '', active: true, sort_order: 10 };

export default function AdminPage() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [items, setItems] = useState<GameItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => { setUser(data.user); void load(data.user); });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => { setUser(session?.user ?? null); setTimeout(() => void load(session?.user ?? null), 0); });
    return () => data.subscription.unsubscribe();
  }, []);

  async function load(currentUser: User | null) {
    setLoading(true);
    if (!currentUser) { setIsAdmin(false); setItems([]); setLoading(false); return; }
    const [{ data: admin }, { data: content }] = await Promise.all([
      supabase.from('app_admins').select('user_id').eq('user_id', currentUser.id).maybeSingle(),
      supabase.from('game_content').select('*').eq('level', 'B1').eq('game_key', 'opposites').order('sort_order'),
    ]);
    setIsAdmin(!!admin); setItems((content ?? []) as GameItem[]); setLoading(false);
  }
  async function signIn() {
    setMessage(''); const { error } = await supabase.auth.signInWithPassword({ email, password }); if (error) setMessage(error.message);
  }
  function openNew() { setEditingId(null); setForm({ ...EMPTY_FORM, sort_order: (items.at(-1)?.sort_order ?? 0) + 10 }); setMessage(''); setDialogOpen(true); }
  function openEdit(item: GameItem) { setEditingId(item.id); setForm({ phrase_before: item.phrase_before, target_word: item.target_word, phrase_after: item.phrase_after, opposite_word: item.opposite_word, hint: item.hint ?? '', active: item.active, sort_order: item.sort_order }); setMessage(''); setDialogOpen(true); }
  async function save() {
    if (!form.target_word.trim() || !form.opposite_word.trim()) { setMessage('Target word and opposite are required.'); return; }
    const values = { level: 'B1', game_key: 'opposites', phrase_before: form.phrase_before, target_word: form.target_word.trim(), phrase_after: form.phrase_after, opposite_word: form.opposite_word.trim(), hint: form.hint.trim() || null, active: form.active, sort_order: form.sort_order };
    const result = editingId ? await supabase.from('game_content').update(values).eq('id', editingId) : await supabase.from('game_content').insert(values);
    if (result.error) { setMessage(result.error.message); return; }
    setDialogOpen(false); await load(user);
  }
  async function remove() {
    if (!editingId) return;
    const { error } = await supabase.from('game_content').delete().eq('id', editingId);
    if (error) { setMessage(error.message); return; }
    setDialogOpen(false); await load(user);
  }

  return <main className="min-h-screen bg-[#f5f7f2] text-[#17221b]">
    <header className="border-b border-[#dce3d9] bg-white/90 px-5 py-3 md:px-8"><div className="mx-auto flex max-w-6xl items-center justify-between"><a href="./" className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-xl bg-[#1f6f4a] text-white"><BookOpen size={19} /></span><span><span className="block font-semibold">Lernzeit</span><span className="block text-[11px] text-[#718077]">Content administration</span></span></a><a href="./practice.html" className="flex items-center gap-2 text-sm font-medium text-[#4e5e54] hover:text-[#1f6f4a]"><ArrowLeft size={16} />Back to Practice</a></div></header>
    <section className="mx-auto max-w-6xl px-5 py-9 md:px-8"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#3c805d]"><ShieldCheck size={15} />Administration</div><h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em]">Game content</h1><p className="mt-2 text-sm text-[#66736b]">Maintain the exercises learners see in B1 games.</p></div>{isAdmin && <Button onClick={openNew} className="rounded-xl bg-[#1f6f4a] hover:bg-[#185c3d]"><Plus />Add exercise</Button>}</div>
      {loading ? <div className="mt-10 rounded-2xl border border-[#dce3d9] bg-white p-8 text-sm text-[#718077]">Loading administration…</div> : !user ? <div className="mt-10 max-w-md rounded-2xl border border-[#dce3d9] bg-white p-6 shadow-sm"><h2 className="text-xl font-semibold">Administrator sign-in</h2><p className="mt-1 text-sm text-[#718077]">Sign in with your Lernzeit administrator account.</p><div className="mt-5 space-y-3"><Input type="email" placeholder="Email" value={email} onChange={(event) => setEmail(event.target.value)} /><Input type="password" placeholder="Password" value={password} onChange={(event) => setPassword(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void signIn(); }} />{message && <p className="text-xs text-red-600">{message}</p>}<Button onClick={() => void signIn()} disabled={!email || password.length < 6} className="w-full bg-[#1f6f4a] hover:bg-[#185c3d]"><LogIn />Sign in</Button></div></div> : !isAdmin ? <div className="mt-10 max-w-xl rounded-2xl border border-[#eadfc7] bg-[#fffaf0] p-6"><h2 className="font-semibold text-[#7b5a20]">Administrator access required</h2><p className="mt-2 text-sm text-[#806c49]">This account can practice games but cannot change shared learning content.</p><Button variant="outline" className="mt-4" onClick={() => void supabase.auth.signOut()}>Sign in with another account</Button></div> : <div className="mt-8 overflow-hidden rounded-2xl border border-[#dce3d9] bg-white"><div className="grid grid-cols-[1fr_130px_80px] gap-4 border-b border-[#e5eae4] bg-[#f8faf7] px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[#748078]"><span>Sentence and answer</span><span>Status</span><span /></div>{items.map((item) => <button key={item.id} onClick={() => openEdit(item)} className="grid w-full grid-cols-[1fr_130px_80px] items-center gap-4 border-b border-[#edf0ec] px-5 py-4 text-left last:border-0 hover:bg-[#f8faf7]"><span><span className="block text-sm font-medium">{item.phrase_before}<strong className="text-[#1f6f4a]">{item.target_word}</strong>{item.phrase_after}</span><span className="mt-1 block text-xs text-[#718077]">Opposite: {item.opposite_word}</span></span><span className={`w-fit rounded-full px-2.5 py-1 text-xs font-medium ${item.active ? 'bg-[#e7f4eb] text-[#257049]' : 'bg-[#eef0ee] text-[#737d76]'}`}>{item.active ? 'Active' : 'Hidden'}</span><Pencil size={16} className="justify-self-end text-[#718077]" /></button>)}</div>}
    </section>
    <footer className="mx-auto flex max-w-6xl justify-end px-5 pb-6 text-[11px] text-[#87928a] md:px-8">Version {APP_VERSION}</footer>
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogContent className="max-w-xl rounded-2xl p-5"><DialogHeader><DialogTitle>{editingId ? 'Edit exercise' : 'Add exercise'}</DialogTitle><DialogDescription>Build the sentence around the highlighted target word, then supply its opposite.</DialogDescription></DialogHeader><div className="space-y-4 py-2"><div className="grid gap-3 sm:grid-cols-[1fr_140px_1fr]"><label className="text-sm font-medium">Before<Input className="mt-2" value={form.phrase_before} onChange={(event) => setForm({ ...form, phrase_before: event.target.value })} placeholder="Den Fahrstuhl " /></label><label className="text-sm font-medium">Target word<Input className="mt-2" value={form.target_word} onChange={(event) => setForm({ ...form, target_word: event.target.value })} placeholder="betreten" /></label><label className="text-sm font-medium">After<Input className="mt-2" value={form.phrase_after} onChange={(event) => setForm({ ...form, phrase_after: event.target.value })} /></label></div><label className="block text-sm font-medium">Opposite word<Input className="mt-2" value={form.opposite_word} onChange={(event) => setForm({ ...form, opposite_word: event.target.value })} placeholder="verlassen" /></label><label className="block text-sm font-medium">Hint (optional)<Input className="mt-2" value={form.hint} onChange={(event) => setForm({ ...form, hint: event.target.value })} placeholder="Man geht hinaus." /></label><div className="grid grid-cols-2 gap-3"><label className="block text-sm font-medium">Order<Input className="mt-2" type="number" value={form.sort_order} onChange={(event) => setForm({ ...form, sort_order: Number(event.target.value) })} /></label><label className="flex items-end gap-2 pb-2 text-sm font-medium"><input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} className="size-4 accent-[#1f6f4a]" />Visible to learners</label></div>{message && <p className="text-xs text-red-600">{message}</p>}</div><DialogFooter className="-mx-5 -mb-5 justify-between px-5 sm:justify-between">{editingId ? <Button variant="outline" className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => void remove()}><Trash2 />Delete</Button> : <span />}<div className="flex gap-2"><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button><Button onClick={() => void save()} className="bg-[#1f6f4a] hover:bg-[#185c3d]">{editingId ? <Save /> : <Check />}{editingId ? 'Save changes' : 'Add exercise'}</Button></div></DialogFooter></DialogContent></Dialog>
  </main>;
}
