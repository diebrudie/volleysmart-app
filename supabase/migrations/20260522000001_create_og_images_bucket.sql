INSERT INTO storage.buckets (id, name, public)
VALUES ('og-images', 'og-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read access for og-images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'og-images');

CREATE POLICY "Service role can manage og-images"
  ON storage.objects FOR ALL
  USING (bucket_id = 'og-images')
  WITH CHECK (bucket_id = 'og-images');
