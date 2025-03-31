
-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Allow public signup and auth service to manage users
CREATE POLICY "Enable insert for authenticated users only" 
ON public.users FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- Allow users to read their own data
CREATE POLICY "Users can read own data" 
ON public.users FOR SELECT 
USING (auth.uid() = id);

-- Allow users to update their own data
CREATE POLICY "Users can update own data" 
ON public.users FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
