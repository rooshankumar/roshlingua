
-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create policy for inserting records
CREATE POLICY "Users can insert their own record"
ON public.users
FOR INSERT
WITH CHECK (auth.uid() = id);

-- Create policy for viewing records
CREATE POLICY "Users can view their own record"
ON public.users
FOR SELECT
USING (auth.uid() = id);

-- Create policy for updating records
CREATE POLICY "Users can update their own record"
ON public.users
FOR UPDATE
USING (auth.uid() = id);
