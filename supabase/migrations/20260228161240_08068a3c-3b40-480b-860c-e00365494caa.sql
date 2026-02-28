
-- Fix: Replace overly permissive INSERT policy on commissions
-- The trigger uses SECURITY DEFINER so it bypasses RLS anyway
DROP POLICY "System can insert commissions" ON public.commissions;

CREATE POLICY "Admin can insert commissions"
  ON public.commissions FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'super_admin'::app_role) OR
    has_role(auth.uid(), 'admin'::app_role)
  );
