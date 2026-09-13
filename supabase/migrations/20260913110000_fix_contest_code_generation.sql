-- Supabase installs pgcrypto functions such as gen_random_bytes in the
-- extensions schema. Keep the function's search path explicit and secure.
alter function public.create_contest(text, integer, text)
set search_path = public, extensions;
