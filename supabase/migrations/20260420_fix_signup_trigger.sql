-- Fix: signup falhava com "Database error saving new user"
-- Causa: on_auth_user_created chamava sync_profile_email() sem SET search_path = public
-- Fix: dropar trigger de INSERT redundante + incluir email no handle_new_user

-- 1. Remove o trigger de INSERT que chamava sync_profile_email sem search_path
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2. Atualiza handle_new_user para também persistir o email na criação do profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, avatar_url, email)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Nota: sync_profile_email() continua ativo apenas para AFTER UPDATE OF email
-- (on_auth_user_email_updated), que é o caso correto de uso.
