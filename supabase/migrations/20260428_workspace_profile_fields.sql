-- ============================================================
-- Campos cadastrais de empresa + storage para logos e avatares
-- ============================================================

-- Novos campos em workspaces
ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS display_name       TEXT,
  ADD COLUMN IF NOT EXISTS legal_name         TEXT,
  ADD COLUMN IF NOT EXISTS document           TEXT,
  ADD COLUMN IF NOT EXISTS phone              TEXT,
  ADD COLUMN IF NOT EXISTS email              TEXT,
  ADD COLUMN IF NOT EXISTS address_street     TEXT,
  ADD COLUMN IF NOT EXISTS address_number     TEXT,
  ADD COLUMN IF NOT EXISTS address_complement TEXT,
  ADD COLUMN IF NOT EXISTS address_district   TEXT,
  ADD COLUMN IF NOT EXISTS address_city       TEXT,
  ADD COLUMN IF NOT EXISTS address_state      CHAR(2),
  ADD COLUMN IF NOT EXISTS address_zipcode    TEXT,
  ADD COLUMN IF NOT EXISTS address_country    CHAR(2) DEFAULT 'BR';

-- ============================================================
-- Storage: logos de empresas (público, 5 MB)
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'workspace-logos', 'workspace-logos', true, 5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Storage: avatares de usuários (público, 2 MB)
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars', 'avatars', true, 2097152,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- RLS storage: workspace-logos
-- Path: workspace-logos/{workspace_id}/logo.{ext}
-- Owner/admin do workspace pode escrever; leitura pública.
-- ============================================================

DO $$ BEGIN
  CREATE POLICY "workspace_logos_insert" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
      bucket_id = 'workspace-logos'
      AND (storage.foldername(name))[1] IN (
        SELECT wm.workspace_id::text
        FROM   workspace_members wm
        WHERE  wm.user_id    = auth.uid()
          AND  wm.role       IN ('owner', 'admin')
          AND  wm.deleted_at IS NULL
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "workspace_logos_update" ON storage.objects
    FOR UPDATE TO authenticated
    USING (
      bucket_id = 'workspace-logos'
      AND (storage.foldername(name))[1] IN (
        SELECT wm.workspace_id::text
        FROM   workspace_members wm
        WHERE  wm.user_id    = auth.uid()
          AND  wm.role       IN ('owner', 'admin')
          AND  wm.deleted_at IS NULL
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "workspace_logos_delete" ON storage.objects
    FOR DELETE TO authenticated
    USING (
      bucket_id = 'workspace-logos'
      AND (storage.foldername(name))[1] IN (
        SELECT wm.workspace_id::text
        FROM   workspace_members wm
        WHERE  wm.user_id    = auth.uid()
          AND  wm.role       IN ('owner', 'admin')
          AND  wm.deleted_at IS NULL
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "workspace_logos_select" ON storage.objects
    FOR SELECT USING (bucket_id = 'workspace-logos');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- RLS storage: avatars
-- Path: avatars/{user_id}/avatar.{ext}
-- Usuário só escreve no próprio path; leitura pública.
-- ============================================================

DO $$ BEGIN
  CREATE POLICY "avatars_insert" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
      bucket_id = 'avatars'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "avatars_update" ON storage.objects
    FOR UPDATE TO authenticated
    USING (
      bucket_id = 'avatars'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "avatars_delete" ON storage.objects
    FOR DELETE TO authenticated
    USING (
      bucket_id = 'avatars'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "avatars_select" ON storage.objects
    FOR SELECT USING (bucket_id = 'avatars');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
