-- Torna o bucket de avatares privado
UPDATE storage.buckets SET public = false WHERE id = 'avatars';

-- Remove policy de leitura pública e restringe a usuários autenticados
DROP POLICY IF EXISTS "avatars_select" ON storage.objects;

DO $$ BEGIN
  CREATE POLICY "avatars_select" ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id = 'avatars');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
