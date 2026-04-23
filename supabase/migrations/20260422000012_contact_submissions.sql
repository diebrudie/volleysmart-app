-- Contact form submissions table
CREATE TABLE IF NOT EXISTS public.contact_submissions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL,
  reason text NOT NULL,
  message text NOT NULL,
  source text DEFAULT 'unknown',
  created_at timestamptz DEFAULT now()
);

-- Allow anonymous and authenticated users to insert (public contact form)
ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a contact form"
  ON public.contact_submissions
  FOR INSERT
  WITH CHECK (true);
