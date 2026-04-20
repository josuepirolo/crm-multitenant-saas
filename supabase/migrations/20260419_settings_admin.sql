-- ============================================================
-- Migration: Settings + Admin Panel
-- ============================================================

-- 1. Adiciona colunas ao profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS email         text,
  ADD COLUMN IF NOT EXISTS is_superadmin boolean NOT NULL DEFAULT false;

-- Popula email dos usuários já cadastrados
UPDATE profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND p.email IS NULL;

-- Trigger para manter email sincronizado com auth.users
CREATE OR REPLACE FUNCTION sync_profile_email()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE profiles SET email = NEW.email WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_email_updated ON auth.users;
CREATE TRIGGER on_auth_user_email_updated
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW EXECUTE FUNCTION sync_profile_email();

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION sync_profile_email();

-- 2. Função para lookup de usuário por email (usada no invite)
CREATE OR REPLACE FUNCTION get_user_id_by_email(lookup_email text)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT id FROM auth.users WHERE email = lookup_email LIMIT 1;
$$;

-- Garante que apenas funções autenticadas chamem esta function via RPC
REVOKE ALL ON FUNCTION get_user_id_by_email(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_user_id_by_email(text) TO service_role;

-- 3. Define o primeiro superadmin (substitua pelo seu user_id real)
-- UPDATE profiles SET is_superadmin = true WHERE id = 'SEU-USER-ID-AQUI';

-- 4. RLS: is_superadmin não deve ser alterável pelo próprio usuário
-- Garante que apenas service_role pode modificar is_superadmin
CREATE POLICY "superadmin_immutable" ON profiles
  AS RESTRICTIVE
  FOR UPDATE
  USING (true)
  WITH CHECK (
    is_superadmin = (SELECT is_superadmin FROM profiles WHERE id = auth.uid())
    OR current_role = 'service_role'
  );
