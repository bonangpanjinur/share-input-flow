-- Allow public (unauthenticated) users to read active shared links
CREATE POLICY "Public can read active shared links"
  ON public.shared_links
  FOR SELECT
  USING (is_active = true);
