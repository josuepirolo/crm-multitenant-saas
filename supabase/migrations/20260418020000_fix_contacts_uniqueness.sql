-- =============================================
-- FIX: Unicidade de contatos — phone, email, document (CPF/CNPJ)
-- =============================================
-- Problema: índices anteriores não normalizavam dados existentes
-- e não tratavam telefone formatado vs. apenas dígitos.
-- Esta migration substitui os índices parciais anteriores com uma
-- abordagem correta: trigger de normalização + deduplicação de dados existentes.
-- =============================================

-- =============================================
-- 1. ADICIONAR COLUNA document (CPF / CNPJ)
-- =============================================
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS document TEXT;

-- =============================================
-- 2. TRIGGER — normalização automática antes de INSERT/UPDATE
-- =============================================
CREATE OR REPLACE FUNCTION contacts_normalize()
RETURNS TRIGGER AS $$
BEGIN
  -- Phone: apenas dígitos
  IF NEW.phone IS NOT NULL THEN
    NEW.phone := NULLIF(regexp_replace(NEW.phone, '[^0-9]', '', 'g'), '');
  END IF;

  -- Document (CPF/CNPJ): apenas dígitos
  IF NEW.document IS NOT NULL THEN
    NEW.document := NULLIF(regexp_replace(NEW.document, '[^0-9]', '', 'g'), '');
  END IF;

  -- Email: lowercase + trim
  IF NEW.email IS NOT NULL THEN
    NEW.email := NULLIF(LOWER(TRIM(NEW.email)), '');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_contacts_normalize ON contacts;
CREATE TRIGGER trg_contacts_normalize
  BEFORE INSERT OR UPDATE OF phone, email, document ON contacts
  FOR EACH ROW EXECUTE FUNCTION contacts_normalize();

-- =============================================
-- 3. NORMALIZAR DADOS EXISTENTES
-- =============================================
UPDATE contacts SET
  phone    = NULLIF(regexp_replace(COALESCE(phone, ''),    '[^0-9]', '', 'g'), ''),
  document = NULLIF(regexp_replace(COALESCE(document, ''), '[^0-9]', '', 'g'), ''),
  email    = NULLIF(LOWER(TRIM(COALESCE(email, ''))), '');

-- =============================================
-- 4. DEDUPLICAÇÃO — manter o mais recente, soft-delete os demais
-- =============================================

-- Duplicatas por phone dentro do mesmo workspace
WITH ranked AS (
  SELECT id,
    ROW_NUMBER() OVER (
      PARTITION BY workspace_id, phone
      ORDER BY created_at DESC
    ) AS rn
  FROM contacts
  WHERE phone IS NOT NULL AND deleted_at IS NULL
),
dupes AS (SELECT id FROM ranked WHERE rn > 1)
UPDATE contacts
  SET deleted_at = NOW()
  WHERE id IN (SELECT id FROM dupes) AND deleted_at IS NULL;

-- Duplicatas por email dentro do mesmo workspace
WITH ranked AS (
  SELECT id,
    ROW_NUMBER() OVER (
      PARTITION BY workspace_id, email
      ORDER BY created_at DESC
    ) AS rn
  FROM contacts
  WHERE email IS NOT NULL AND deleted_at IS NULL
),
dupes AS (SELECT id FROM ranked WHERE rn > 1)
UPDATE contacts
  SET deleted_at = NOW()
  WHERE id IN (SELECT id FROM dupes) AND deleted_at IS NULL;

-- =============================================
-- 5. REMOVER ÍNDICES ANTERIORES (podem não ter sido criados corretamente)
-- =============================================
DROP INDEX IF EXISTS idx_contacts_unique_phone;
DROP INDEX IF EXISTS idx_contacts_unique_email;
DROP INDEX IF EXISTS idx_contacts_phone; -- índice simples antigo

-- =============================================
-- 6. CRIAR ÍNDICES ÚNICOS PARCIAIS
-- Normalização já foi feita pelo trigger/UPDATE acima,
-- então podemos usar comparação simples (sem função).
-- =============================================

-- Telefone único por workspace (somente ativos)
CREATE UNIQUE INDEX idx_contacts_unique_phone
  ON contacts(workspace_id, phone)
  WHERE phone IS NOT NULL AND deleted_at IS NULL;

-- Email único por workspace (somente ativos, já em lowercase)
CREATE UNIQUE INDEX idx_contacts_unique_email
  ON contacts(workspace_id, email)
  WHERE email IS NOT NULL AND deleted_at IS NULL;

-- Document (CPF/CNPJ) único por workspace (somente ativos e preenchidos)
CREATE UNIQUE INDEX idx_contacts_unique_document
  ON contacts(workspace_id, document)
  WHERE document IS NOT NULL AND deleted_at IS NULL;

-- Índice de lookup rápido por telefone (para buscas)
CREATE INDEX IF NOT EXISTS idx_contacts_phone_lookup ON contacts(phone);
CREATE INDEX IF NOT EXISTS idx_contacts_email_lookup ON contacts(email);
