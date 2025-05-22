
-- This file contains additional SQL statements that need to be run 
-- to complete the database setup. Run these manually if they haven't been run yet.

-- Create the user_profiles table
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'editor', 'user'))
);

-- Enable RLS on the user_profiles table
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Set up RLS policies for user_profiles
CREATE POLICY "Users can view their own profile" ON public.user_profiles
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admin users can view all profiles" ON public.user_profiles
FOR SELECT USING (
  auth.uid() IN (
    SELECT id FROM public.user_profiles WHERE role = 'admin'
  )
);

CREATE POLICY "Users can update their own profile" ON public.user_profiles
FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admin users can update any profile" ON public.user_profiles
FOR UPDATE USING (
  auth.uid() IN (
    SELECT id FROM public.user_profiles WHERE role = 'admin'
  )
);

-- Create trigger to automatically create a user_profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, role)
  VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger the function every time a user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
