-- GDPR/LGPD Compliance Tables and Features

-- Create privacy_consents table for user consent tracking
CREATE TABLE IF NOT EXISTS public.privacy_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  consent_type text NOT NULL, -- 'terms_of_service', 'privacy_policy', 'marketing_emails', 'data_processing'
  version text NOT NULL, -- version of the policy/consent
  consent_given boolean NOT NULL DEFAULT false,
  consent_date timestamptz NOT NULL DEFAULT now(),
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, consent_type, version)
);

-- Create data_retention_policies table
CREATE TABLE IF NOT EXISTS public.data_retention_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE,
  data_type text NOT NULL, -- 'chat_messages', 'leads', 'analytics', 'user_data'
  retention_days integer NOT NULL DEFAULT 365,
  auto_delete boolean NOT NULL DEFAULT false,
  justification text, -- legal basis for retention period
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create data_export_requests table for GDPR "right to data portability"
CREATE TABLE IF NOT EXISTS public.data_export_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  request_type text NOT NULL DEFAULT 'full_export', -- 'full_export', 'specific_data'
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  requested_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  expires_at timestamptz,
  download_url text,
  file_size_bytes integer,
  created_by uuid REFERENCES public.profiles(id),
  UNIQUE(user_id) -- Only one active request per user
);

-- Create data_deletion_requests table for GDPR "right to be forgotten"
CREATE TABLE IF NOT EXISTS public.data_deletion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE,
  request_type text NOT NULL DEFAULT 'full_deletion', -- 'full_deletion', 'specific_data'
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  requested_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  justification text, -- user provided reason
  admin_notes text, -- admin notes on the deletion
  hard_delete boolean NOT NULL DEFAULT false, -- true for permanent deletion, false for soft delete
  created_by uuid REFERENCES public.profiles(id),
  UNIQUE(user_id) -- Only one active request per user
);

-- Create privacy_settings table for user privacy preferences
CREATE TABLE IF NOT EXISTS public.privacy_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  marketing_emails boolean NOT NULL DEFAULT true,
  analytics_tracking boolean NOT NULL DEFAULT true,
  chat_data_retention boolean NOT NULL DEFAULT true,
  personalized_ads boolean NOT NULL DEFAULT true,
  data_sharing boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create legal_documents table for storing terms and policies
CREATE TABLE IF NOT EXISTS public.legal_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type text NOT NULL, -- 'terms_of_service', 'privacy_policy', 'cookie_policy'
  version text NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  effective_date timestamptz NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create data_processing_logs for audit trail
CREATE TABLE IF NOT EXISTS public.data_processing_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  processing_type text NOT NULL, -- 'collection', 'storage', 'processing', 'sharing', 'deletion'
  data_category text NOT NULL, -- 'personal', 'sensitive', 'public'
  legal_basis text NOT NULL, -- 'consent', 'contract', 'legal_obligation', 'legitimate_interest'
  description text NOT NULL,
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Create functions for GDPR compliance
CREATE OR REPLACE FUNCTION public.get_user_consent_status(user_uuid uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'terms_of_service', COALESCE((SELECT consent_given FROM public.privacy_consents WHERE user_id = user_uuid AND consent_type = 'terms_of_service' ORDER BY consent_date DESC LIMIT 1), false),
    'privacy_policy', COALESCE((SELECT consent_given FROM public.privacy_consents WHERE user_id = user_uuid AND consent_type = 'privacy_policy' ORDER BY consent_date DESC LIMIT 1), false),
    'marketing_emails', COALESCE((SELECT consent_given FROM public.privacy_consents WHERE user_id = user_uuid AND consent_type = 'marketing_emails' ORDER BY consent_date DESC LIMIT 1), false),
    'data_processing', COALESCE((SELECT consent_given FROM public.privacy_consents WHERE user_id = user_uuid AND consent_type = 'data_processing' ORDER BY consent_date DESC LIMIT 1), false)
  ) INTO result;
  
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_data_export_request(user_uuid uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  request_id uuid;
BEGIN
  -- Check for existing pending requests
  IF EXISTS (SELECT 1 FROM public.data_export_requests WHERE user_id = user_uuid AND status IN ('pending', 'processing')) THEN
    RAISE EXCEPTION 'Já existe uma solicitação de exportação pendente';
  END IF;

  -- Create new export request
  INSERT INTO public.data_export_requests (user_id, expires_at)
  VALUES (user_uuid, NOW() + INTERVAL '7 days')
  RETURNING id INTO request_id;
  
  RETURN request_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_data_deletion_request(user_uuid uuid, deletion_type text DEFAULT 'full_deletion', justification text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  request_id uuid;
  company_uuid uuid;
BEGIN
  -- Get user's company
  SELECT empresa_id INTO company_uuid FROM public.profiles WHERE id = user_uuid;
  
  -- Check for existing pending requests
  IF EXISTS (SELECT 1 FROM public.data_deletion_requests WHERE user_id = user_uuid AND status IN ('pending', 'processing')) THEN
    RAISE EXCEPTION 'Já existe uma solicitação de exclusão pendente';
  END IF;

  -- Create new deletion request
  INSERT INTO public.data_deletion_requests (user_id, company_id, request_type, justification)
  VALUES (user_uuid, company_uuid, deletion_type, justification)
  RETURNING id INTO request_id;
  
  RETURN request_id;
END;
$$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_privacy_consents_user_type ON public.privacy_consents(user_id, consent_type);
CREATE INDEX IF NOT EXISTS idx_privacy_consents_date ON public.privacy_consents(consent_date DESC);
CREATE INDEX IF NOT EXISTS idx_data_retention_company_type ON public.data_retention_policies(company_id, data_type);
CREATE INDEX IF NOT EXISTS idx_data_export_user_status ON public.data_export_requests(user_id, status);
CREATE INDEX IF NOT EXISTS idx_data_deletion_user_status ON public.data_deletion_requests(user_id, status);
CREATE INDEX IF NOT EXISTS idx_privacy_settings_user ON public.privacy_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_legal_documents_type_active ON public.legal_documents(document_type, is_active);
CREATE INDEX IF NOT EXISTS idx_data_processing_company_date ON public.data_processing_logs(company_id, created_at DESC);

-- RLS Policies for GDPR tables
ALTER TABLE public.privacy_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_retention_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_export_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_deletion_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.privacy_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_processing_logs ENABLE ROW LEVEL SECURITY;

-- Privacy Consents Policies
CREATE POLICY "Users can view own consent history"
ON public.privacy_consents FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can update own consent"
ON public.privacy_consents FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Data Retention Policies (company admin only)
CREATE POLICY "Company admins can view own retention policies"
ON public.data_retention_policies FOR SELECT
USING (
  company_id IN (
    SELECT empresa_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Company admins can manage own retention policies"
ON public.data_retention_policies FOR ALL
USING (
  company_id IN (
    SELECT empresa_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- Data Export Requests
CREATE POLICY "Users can view own export requests"
ON public.data_export_requests FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can create own export requests"
ON public.data_export_requests FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Data Deletion Requests
CREATE POLICY "Users can view own deletion requests"
ON public.data_deletion_requests FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can create own deletion requests"
ON public.data_deletion_requests FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Company admins can view deletion requests for their company"
ON public.data_deletion_requests FOR SELECT
USING (
  company_id IN (
    SELECT empresa_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- Privacy Settings
CREATE POLICY "Users can view own privacy settings"
ON public.privacy_settings FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can update own privacy settings"
ON public.privacy_settings FOR ALL
USING (user_id = auth.uid());

-- Legal Documents (public for active documents)
CREATE POLICY "Users can view active legal documents"
ON public.legal_documents FOR SELECT
USING (is_active = true);

-- Data Processing Logs
CREATE POLICY "Users can view own processing logs"
ON public.data_processing_logs FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Company admins can view company processing logs"
ON public.data_processing_logs FOR SELECT
USING (
  company_id IN (
    SELECT empresa_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "System can insert processing logs"
ON public.data_processing_logs FOR INSERT
WITH CHECK (true);