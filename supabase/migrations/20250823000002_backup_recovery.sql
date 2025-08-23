-- Backup and Recovery Configuration

-- Create backup_metadata table for tracking backups
CREATE TABLE IF NOT EXISTS public.backup_metadata (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_type text NOT NULL CHECK (backup_type IN ('full', 'incremental', 'specific_tables')),
  backup_size_bytes bigint,
  backup_location text NOT NULL,
  checksum text,
  backup_start timestamptz NOT NULL DEFAULT now(),
  backup_end timestamptz,
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
  error_message text,
  backed_up_tables text[],
  created_by uuid REFERENCES public.profiles(id),
  metadata jsonb
);

-- Create restore_logs table for tracking restore operations
CREATE TABLE IF NOT EXISTS public.restore_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_id uuid REFERENCES public.backup_metadata(id),
  restore_type text NOT NULL CHECK (restore_type IN ('full', 'partial', 'point_in_time')),
  restore_location text NOT NULL,
  restore_start timestamptz NOT NULL DEFAULT now(),
  restore_end timestamptz,
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
  error_message text,
  restored_tables text[],
  created_by uuid REFERENCES public.profiles(id),
  metadata jsonb
);

-- Create data_classification table for sensitive data tracking
CREATE TABLE IF NOT EXISTS public.data_classification (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  column_name text NOT NULL,
  data_type text NOT NULL CHECK (data_type IN ('personal', 'sensitive', 'financial', 'health', 'public')),
  sensitivity_level text NOT NULL CHECK (sensitivity_level IN ('low', 'medium', 'high', 'critical')),
  encryption_required boolean NOT NULL DEFAULT false,
  retention_days integer,
  legal_basis text,
  UNIQUE(table_name, column_name)
);

-- Create backup_schedules table for automated backups
CREATE TABLE IF NOT EXISTS public.backup_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  backup_type text NOT NULL CHECK (backup_type IN ('full', 'incremental')),
  schedule_expression text NOT NULL, -- cron expression
  retention_days integer NOT NULL DEFAULT 30,
  enabled boolean NOT NULL DEFAULT true,
  last_run timestamptz,
  next_run timestamptz,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create backup_notifications table for backup alerts
CREATE TABLE IF NOT EXISTS public.backup_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_id uuid REFERENCES public.backup_metadata(id),
  notification_type text NOT NULL CHECK (notification_type IN ('success', 'failure', 'warning')),
  recipients text[] NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  sent boolean NOT NULL DEFAULT false,
  sent_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Insert data classification records for sensitive data
INSERT INTO public.data_classification (table_name, column_name, data_type, sensitivity_level, encryption_required, retention_days, legal_basis) VALUES
('profiles', 'email', 'personal', 'high', true, NULL, 'contract'),
('profiles', 'nome', 'personal', 'medium', false, NULL, 'contract'),
('profiles', 'telefone', 'personal', 'high', true, NULL, 'contract'),
('empresas', 'name_empresa', 'public', 'low', false, NULL, 'contract'),
('empresas', 'cnpj', 'personal', 'high', true, NULL, 'legal_obligation'),
('chat_messages', 'content', 'personal', 'medium', true, 365, 'consent'),
('chat_messages', 'media_url', 'personal', 'medium', true, 365, 'consent'),
('leads', 'nome', 'personal', 'medium', false, 730, 'legitimate_interest'),
('leads', 'email', 'personal', 'high', true, 730, 'legitimate_interest'),
('leads', 'telefone', 'personal', 'high', true, 730, 'legitimate_interest'),
('leads', 'observacoes', 'personal', 'medium', false, 730, 'legitimate_interest')
ON CONFLICT (table_name, column_name) DO NOTHING;

-- Create functions for backup management
CREATE OR REPLACE FUNCTION public.create_backup_metadata(
  backup_type_param text,
  backup_location_param text,
  backed_up_tables_param text[],
  metadata_param jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  backup_id uuid;
BEGIN
  INSERT INTO public.backup_metadata (
    backup_type, backup_location, backed_up_tables, metadata, created_by
  )
  VALUES (backup_type_param, backup_location_param, backed_up_tables_param, metadata_param, auth.uid())
  RETURNING id INTO backup_id;
  
  RETURN backup_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_backup(backup_uuid uuid, backup_size_bytes_param bigint, checksum_param text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.backup_metadata
  SET backup_end = now(),
      status = 'completed',
      backup_size_bytes = backup_size_bytes_param,
      checksum = checksum_param
  WHERE id = backup_uuid;
END;
$$;

CREATE OR REPLACE FUNCTION public.fail_backup(backup_uuid uuid, error_message_param text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.backup_metadata
  SET backup_end = now(),
      status = 'failed',
      error_message = error_message_param
  WHERE id = backup_uuid;
END;
$$;

CREATE OR REPLACE FUNCTION public.schedule_backup(
  name_param text,
  backup_type_param text,
  schedule_expression_param text,
  retention_days_param integer DEFAULT 30,
  enabled_param boolean DEFAULT true
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  schedule_id uuid;
BEGIN
  INSERT INTO public.backup_schedules (name, backup_type, schedule_expression, retention_days, enabled, created_by)
  VALUES (name_param, backup_type_param, schedule_expression_param, retention_days_param, enabled_param, auth.uid())
  RETURNING id INTO schedule_id;
  
  RETURN schedule_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_backup_report(start_date timestamptz DEFAULT NOW() - INTERVAL '30 days', end_date timestamptz DEFAULT NOW())
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_backups', COUNT(*),
    'successful_backups', COUNT(CASE WHEN status = 'completed' THEN 1 END),
    'failed_backups', COUNT(CASE WHEN status = 'failed' THEN 1 END),
    'total_size', COALESCE(SUM(backup_size_bytes), 0),
    'backup_types', jsonb_object_agg(backup_type, count)
  ) INTO result
  FROM (
    SELECT backup_type, status, backup_size_bytes, COUNT(*) as count
    FROM public.backup_metadata
    WHERE backup_start BETWEEN start_date AND end_date
    GROUP BY backup_type, status, backup_size_bytes
  ) t;
  
  RETURN result;
END;
$$;

-- Create restore functions
CREATE OR REPLACE FUNCTION public.create_restore_log(
  backup_id_param uuid,
  restore_type_param text,
  restore_location_param text,
  restored_tables_param text[],
  metadata_param jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  restore_id uuid;
BEGIN
  INSERT INTO public.restore_logs (
    backup_id, restore_type, restore_location, restored_tables, metadata, created_by
  )
  VALUES (backup_id_param, restore_type_param, restore_location_param, restored_tables_param, metadata_param, auth.uid())
  RETURNING id INTO restore_id;
  
  RETURN restore_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_restore(restore_uuid uuid, success boolean, error_message_param text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.restore_logs
  SET restore_end = now(),
      status = CASE WHEN success THEN 'completed' ELSE 'failed' END,
      error_message = error_message_param
  WHERE id = restore_uuid;
END;
$$;

-- Create data retention cleanup function
CREATE OR REPLACE FUNCTION public.cleanup_expired_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  retention_record RECORD;
  affected_rows integer;
BEGIN
  -- Process each retention policy
  FOR retention_record IN
    SELECT table_name, column_name, retention_days
    FROM public.data_classification
    WHERE retention_days IS NOT NULL
  LOOP
    -- Dynamic SQL to delete old records based on retention policy
    -- This is a simplified version - in production, implement proper data masking/deletion
    EXECUTE format('DELETE FROM %I WHERE created_at < NOW() - INTERVAL ''%s days''', 
                   retention_record.table_name, 
                   retention_record.retention_days);
    
    GET DIAGNOSTICS affected_rows := ROW_COUNT;
    
    -- Log the cleanup
    INSERT INTO public.data_processing_logs (processing_type, data_category, legal_basis, description)
    VALUES ('deletion', 'expired_data', 'legal_obligation', 
            format('Cleanup %s records from %s', affected_rows, retention_record.table_name));
  END LOOP;
END;
$$;

-- Create backup verification function
CREATE OR REPLACE FUNCTION public.verify_backup_integrity(backup_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  backup_record RECORD;
  calculated_checksum text;
BEGIN
  SELECT * INTO backup_record FROM public.backup_metadata WHERE id = backup_uuid;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Backup not found';
  END IF;
  
  -- In a real implementation, this would verify the actual backup file
  -- For now, we'll just check if the backup was marked as successful
  RETURN backup_record.status = 'completed' AND backup_record.checksum IS NOT NULL;
END;
$$;

-- RLS Policies for backup and recovery
ALTER TABLE public.backup_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restore_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_classification ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backup_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backup_notifications ENABLE ROW LEVEL SECURITY;

-- Backup Metadata Policies
CREATE POLICY "System can manage backups"
ON public.backup_metadata FOR ALL
USING (true);

CREATE POLICY "Admins can view backup metadata"
ON public.backup_metadata FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  )
);

-- Restore Logs Policies
CREATE POLICY "System can manage restore logs"
ON public.restore_logs FOR ALL
USING (true);

-- Data Classification Policies
CREATE POLICY "Admins can view data classification"
ON public.data_classification FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  )
);

-- Backup Schedules Policies
CREATE POLICY "Admins can manage backup schedules"
ON public.backup_schedules FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  )
);

-- Views for backup monitoring
CREATE OR REPLACE VIEW public.backup_status_summary AS
SELECT 
  backup_type,
  COUNT(*) as total_backups,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful,
  COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
  AVG(backup_size_bytes) as avg_size_bytes,
  MAX(backup_end) as last_backup,
  SUM(backup_size_bytes) as total_size_bytes
FROM public.backup_metadata
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY backup_type;

CREATE OR REPLACE VIEW public.restore_status_summary AS
SELECT 
  restore_type,
  COUNT(*) as total_restores,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful,
  COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
  MAX(restore_end) as last_restore
FROM public.restore_logs
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY restore_type;