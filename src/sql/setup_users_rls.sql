
-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Allow public signup
CREATE POLICY "Allow public signup"
ON public.users
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Users can read own record 
CREATE POLICY "Users can read own record"
ON public.users
FOR SELECT
USING (auth.uid() = id);

-- Users can update own record
CREATE POLICY "Users can update own record" 
ON public.users
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Allow auth service manage users
CREATE POLICY "Auth service manage users"
ON public.users
FOR ALL 
USING (auth.uid() = id);
