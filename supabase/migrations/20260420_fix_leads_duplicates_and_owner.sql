-- =============================================
-- 1. REMOVER DUPLICADOS DE CONTACTS (leads) POR EMAIL
-- Mantém o registro mais antigo (created_at menor) de cada par (workspace_id, email)
-- =============================================

DELETE FROM contacts
WHERE id IN (
  SELECT id FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY workspace_id, email
        ORDER BY created_at ASC
      ) AS rn
    FROM contacts
    WHERE email IS NOT NULL
      AND email != ''
      AND deleted_at IS NULL
  ) ranked
  WHERE rn > 1
);

-- =============================================
-- 2. GARANTIR ÍNDICE ÚNICO PARCIAL em contacts por email
-- (já pode existir da migration anterior — idempotente)
-- =============================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_contacts_unique_email
  ON contacts(workspace_id, email)
  WHERE email IS NOT NULL AND email != '' AND deleted_at IS NULL;

-- =============================================
-- 3. OWNER DO SAAS — campo is_owner na tabela profiles
-- Apenas 1 registro pode ter is_owner = true (constraint + trigger)
-- Não é atribuível via UI — apenas via service_role diretamente no banco
-- =============================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_owner boolean NOT NULL DEFAULT false;

-- Garante que apenas 1 usuário pode ser owner globalmente
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_single_owner
  ON profiles(is_owner)
  WHERE is_owner = true;

-- Protege is_owner e is_superadmin de alteração pelo próprio usuário
DROP POLICY IF EXISTS "atualizar proprio perfil" ON profiles;
CREATE POLICY "atualizar proprio perfil" ON profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND is_superadmin = (SELECT is_superadmin FROM profiles WHERE id = auth.uid())
    AND is_owner      = (SELECT is_owner      FROM profiles WHERE id = auth.uid())
  );

-- Para ativar o owner, rodar manualmente via service_role:
-- UPDATE profiles SET is_owner = true WHERE id = 'SEU-USER-ID-AQUI';
