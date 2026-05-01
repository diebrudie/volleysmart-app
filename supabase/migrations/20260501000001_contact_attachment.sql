-- Add attachment_url column to contact_submissions
ALTER TABLE public.contact_submissions
  ADD COLUMN attachment_url text;

-- Create storage bucket for contact attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('contact-attachments', 'contact-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to upload to contact-attachments bucket
CREATE POLICY "Anyone can upload contact attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'contact-attachments');

-- Allow public read access
CREATE POLICY "Public read access for contact attachments"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'contact-attachments');
