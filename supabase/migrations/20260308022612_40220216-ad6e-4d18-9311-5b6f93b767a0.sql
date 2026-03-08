-- Create notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  entry_id uuid REFERENCES public.data_entries(id) ON DELETE CASCADE,
  group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "System can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

CREATE OR REPLACE FUNCTION public.notify_on_ktp_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  target_roles app_role[];
  u_id uuid;
  notif_title text;
  notif_message text;
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'ktp_terdaftar_nib' THEN
    target_roles := ARRAY['super_admin', 'admin', 'nib', 'admin_input']::app_role[];
    notif_title := 'KTP Terdaftar NIB';
    notif_message := 'Entri "' || COALESCE(NEW.nama, 'Tanpa Nama') || '" ditandai KTP sudah terdaftar NIB. Mohon ganti KTP.';
  ELSIF NEW.status = 'ktp_terdaftar_sertifikat' THEN
    target_roles := ARRAY['super_admin', 'admin', 'lapangan']::app_role[];
    notif_title := 'KTP Terdaftar Sertifikat';
    notif_message := 'Entri "' || COALESCE(NEW.nama, 'Tanpa Nama') || '" ditandai KTP sudah terdaftar Sertifikat. Mohon ganti KTP.';
  ELSE
    RETURN NEW;
  END IF;

  FOR u_id IN
    SELECT DISTINCT ur.user_id
    FROM user_roles ur
    INNER JOIN group_members gm ON gm.user_id = ur.user_id AND gm.group_id = NEW.group_id
    WHERE ur.role = ANY(target_roles)
  LOOP
    INSERT INTO notifications (user_id, title, message, entry_id, group_id)
    VALUES (u_id, notif_title, notif_message, NEW.id, NEW.group_id);
  END LOOP;

  FOR u_id IN
    SELECT ur.user_id FROM user_roles ur
    WHERE ur.role = 'super_admin'
    AND ur.user_id NOT IN (
      SELECT gm.user_id FROM group_members gm WHERE gm.group_id = NEW.group_id
    )
  LOOP
    INSERT INTO notifications (user_id, title, message, entry_id, group_id)
    VALUES (u_id, notif_title, notif_message, NEW.id, NEW.group_id);
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_ktp_status
  AFTER UPDATE ON public.data_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_ktp_status();
