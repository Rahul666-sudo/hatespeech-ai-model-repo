DROP POLICY "Avatar public read" ON storage.objects;
CREATE POLICY "Signed-in users read avatars" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'avatars');