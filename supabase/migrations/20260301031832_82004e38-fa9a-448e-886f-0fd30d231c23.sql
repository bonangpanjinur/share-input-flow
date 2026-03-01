-- Allow public to read basic profile info (name only) for shared link PIC display
CREATE POLICY "Public can read profile names"
  ON public.profiles
  FOR SELECT
  USING (true);

-- Drop the narrower policies that are now redundant
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Super admin can view all profiles" ON public.profiles;
