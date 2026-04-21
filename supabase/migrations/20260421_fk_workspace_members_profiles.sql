-- Fix: workspace_members.user_id não tinha FK para profiles(id)
-- Sem essa FK o Supabase schema cache não reconhece o relacionamento
-- e a query select("*, profiles(...)") falha com "could not find a relationship"

ALTER TABLE public.workspace_members
  ADD CONSTRAINT workspace_members_user_id_profiles_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
