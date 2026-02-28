-- App settings table for theme/branding management
CREATE TABLE public.app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_by UUID
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can read settings
CREATE POLICY "Anyone can read app settings"
ON public.app_settings FOR SELECT
TO authenticated
USING (true);

-- Only super admin can modify
CREATE POLICY "Super admin can manage settings"
ON public.app_settings FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- Insert default settings
INSERT INTO public.app_settings (key, value) VALUES
  ('app_name', 'HalalTrack'),
  ('primary_color', '217 91% 50%'),
  ('logo_url', '');
