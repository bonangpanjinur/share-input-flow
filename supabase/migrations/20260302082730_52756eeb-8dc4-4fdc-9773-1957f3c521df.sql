
-- 1. Add app_setting for siap_input required fields
INSERT INTO public.app_settings (key, value)
VALUES ('siap_input_required_fields', '["nama","ktp","nib","foto_produk","foto_verifikasi"]')
ON CONFLICT DO NOTHING;

-- 2. Add default field_access for admin_input role
INSERT INTO public.field_access (role, field_name, can_view, can_edit)
VALUES
  ('admin_input', 'nama', true, true),
  ('admin_input', 'alamat', true, true),
  ('admin_input', 'nomor_hp', true, true),
  ('admin_input', 'ktp', true, true),
  ('admin_input', 'nib', true, true),
  ('admin_input', 'foto_produk', true, true),
  ('admin_input', 'foto_verifikasi', true, true),
  ('admin_input', 'sertifikat', true, false)
ON CONFLICT DO NOTHING;

-- 3. Update auto_update_entry_status trigger
CREATE OR REPLACE FUNCTION public.auto_update_entry_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  required_fields jsonb;
  all_filled boolean := true;
  fname text;
BEGIN
  -- If sertifikat_url just filled -> sertifikat_selesai
  IF NEW.sertifikat_url IS NOT NULL AND (OLD.sertifikat_url IS NULL OR OLD.sertifikat_url = '') THEN
    NEW.status := 'sertifikat_selesai';
    RETURN NEW;
  END IF;
  
  -- If nib_url just filled -> nib_selesai (only if status is still early)
  IF NEW.nib_url IS NOT NULL AND (OLD.nib_url IS NULL OR OLD.nib_url = '') 
     AND OLD.status IN ('belum_lengkap', 'siap_input') THEN
    NEW.status := 'nib_selesai';
    RETURN NEW;
  END IF;

  -- Check siap_input: only upgrade from belum_lengkap
  IF OLD.status = 'belum_lengkap' THEN
    SELECT value::jsonb INTO required_fields
    FROM public.app_settings
    WHERE key = 'siap_input_required_fields';

    IF required_fields IS NOT NULL THEN
      FOR fname IN SELECT jsonb_array_elements_text(required_fields) LOOP
        CASE fname
          WHEN 'nama' THEN IF NEW.nama IS NULL OR NEW.nama = '' THEN all_filled := false; END IF;
          WHEN 'alamat' THEN IF NEW.alamat IS NULL OR NEW.alamat = '' THEN all_filled := false; END IF;
          WHEN 'nomor_hp' THEN IF NEW.nomor_hp IS NULL OR NEW.nomor_hp = '' THEN all_filled := false; END IF;
          WHEN 'ktp' THEN IF NEW.ktp_url IS NULL OR NEW.ktp_url = '' THEN all_filled := false; END IF;
          WHEN 'nib' THEN IF NEW.nib_url IS NULL OR NEW.nib_url = '' THEN all_filled := false; END IF;
          WHEN 'foto_produk' THEN IF NEW.foto_produk_url IS NULL OR NEW.foto_produk_url = '' THEN all_filled := false; END IF;
          WHEN 'foto_verifikasi' THEN IF NEW.foto_verifikasi_url IS NULL OR NEW.foto_verifikasi_url = '' THEN all_filled := false; END IF;
          WHEN 'sertifikat' THEN IF NEW.sertifikat_url IS NULL OR NEW.sertifikat_url = '' THEN all_filled := false; END IF;
          ELSE NULL;
        END CASE;
        EXIT WHEN NOT all_filled;
      END LOOP;

      IF all_filled THEN
        NEW.status := 'siap_input';
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 4. RLS policies for admin_input
CREATE POLICY "Admin input can view group entries"
ON public.data_entries FOR SELECT
USING (has_role(auth.uid(), 'admin_input'::app_role) AND is_member_of_group(auth.uid(), group_id));

CREATE POLICY "Admin input can update group entries"
ON public.data_entries FOR UPDATE
USING (has_role(auth.uid(), 'admin_input'::app_role) AND is_member_of_group(auth.uid(), group_id));

CREATE POLICY "Admin input can view their groups"
ON public.groups FOR SELECT
USING (is_member_of_group(auth.uid(), id) AND has_role(auth.uid(), 'admin_input'::app_role));

CREATE POLICY "Admin input can view group members"
ON public.group_members FOR SELECT
USING (is_member_of_group(auth.uid(), group_id) AND has_role(auth.uid(), 'admin_input'::app_role));

CREATE POLICY "Admin input can view shared links"
ON public.shared_links FOR SELECT
USING (has_role(auth.uid(), 'admin_input'::app_role) AND is_member_of_group(auth.uid(), group_id));
