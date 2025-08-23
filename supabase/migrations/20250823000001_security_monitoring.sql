-- Security Monitoring and Alerting System

-- Create security_events table for logging security incidents
CREATE TABLE IF NOT EXISTS public.security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL, -- 'failed_login', 'brute_force_attempt', 'suspicious_login', 'api_rate_limit', 'permission_denied'
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  description text NOT NULL,
  source_ip inet,
  user_agent text,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  company_id uuid REFERENCES public.empresas(id) ON DELETE SET NULL,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create security_alerts table for pending alerts
CREATE TABLE IF NOT EXISTS public.security_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.security_events(id) ON DELETE CASCADE,
  recipients text[] NOT NULL,
  event_data jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  sent_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create login_attempts table for tracking login patterns
CREATE TABLE IF NOT EXISTS public.login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text,
  source_ip inet,
  user_agent text,
  success boolean NOT NULL DEFAULT false,
  failure_reason text,
  created_at timestamptz DEFAULT now()
);

-- Create api_usage_logs table for monitoring API usage
CREATE TABLE IF NOT EXISTS public.api_usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  company_id uuid REFERENCES public.empresas(id) ON DELETE SET NULL,
  endpoint text NOT NULL,
  method text NOT NULL,
  status_code integer,
  response_time_ms integer,
  request_size_bytes integer,
  response_size_bytes integer,
  source_ip inet,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Create blocked_ips table for IP blocking
CREATE TABLE IF NOT EXISTS public.blocked_ips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address inet NOT NULL UNIQUE,
  reason text NOT NULL,
  blocked_until timestamptz,
  blocked_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_security_events_type_severity ON public.security_events(event_type, severity);
CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON public.security_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_source_ip ON public.security_events(source_ip);
CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON public.security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_alerts_status ON public.security_alerts(status);
CREATE INDEX IF NOT EXISTS idx_login_attempts_email_ip ON public.login_attempts(email, source_ip);
CREATE INDEX IF NOT EXISTS idx_login_attempts_created_at ON public.login_attempts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_user_endpoint ON public.api_usage_logs(user_id, endpoint);
CREATE INDEX IF NOT EXISTS idx_api_usage_created_at ON public.api_usage_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_blocked_ips_address ON public.blocked_ips(ip_address);

-- Functions for security monitoring
CREATE OR REPLACE FUNCTION public.check_brute_force_protection(email_param text, ip_param inet)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  failed_attempts integer;
  blocked_until timestamptz;
BEGIN
  -- Check if IP is blocked
  SELECT blocked_until INTO blocked_until
  FROM public.blocked_ips
  WHERE ip_address = ip_param
    AND (blocked_until IS NULL OR blocked_until > now());

  IF blocked_until IS NOT NULL THEN
    RETURN false;
  END IF;

  -- Check failed attempts in last hour
  SELECT COUNT(*) INTO failed_attempts
  FROM public.login_attempts
  WHERE email = email_param
    AND source_ip = ip_param
    AND success = false
    AND created_at > now() - interval '1 hour';

  -- Block after 5 failed attempts
  IF failed_attempts >= 5 THEN
    INSERT INTO public.blocked_ips (ip_address, reason, blocked_until)
    VALUES (ip_param, 'Brute force protection', now() + interval '1 hour')
    ON CONFLICT (ip_address) DO UPDATE
    SET reason = EXCLUDED.reason,
        blocked_until = EXCLUDED.blocked_until,
        created_at = now();

    -- Log security event
    INSERT INTO public.security_events (event_type, severity, description, source_ip)
    VALUES ('brute_force_block', 'high', 'IP blocked after 5 failed login attempts', ip_param);

    RETURN false;
  END IF;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_login_attempt(email_param text, ip_param inet, user_agent_param text, success_param boolean, failure_reason_param text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.login_attempts (email, source_ip, user_agent, success, failure_reason)
  VALUES (email_param, ip_param, user_agent_param, success_param, failure_reason_param);

  -- Log security event for failed attempts
  IF NOT success_param THEN
    INSERT INTO public.security_events (event_type, severity, description, source_ip)
    VALUES ('failed_login', 'medium', 'Failed login attempt for email: ' || email_param, ip_param);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_api_usage(
  user_uuid uuid,
  company_uuid uuid,
  endpoint_param text,
  method_param text,
  status_code_param integer,
  response_time_ms_param integer,
  request_size_bytes_param integer,
  response_size_bytes_param integer,
  source_ip_param inet,
  user_agent_param text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.api_usage_logs (
    user_id, company_id, endpoint, method, status_code, response_time_ms,
    request_size_bytes, response_size_bytes, source_ip, user_agent
  )
  VALUES (
    user_uuid, company_uuid, endpoint_param, method_param, status_code_param,
    response_time_ms_param, request_size_bytes_param, response_size_bytes_param,
    source_ip_param, user_agent_param
  );

  -- Log rate limit events
  IF status_code_param = 429 THEN
    INSERT INTO public.security_events (event_type, severity, description, source_ip, user_id)
    VALUES ('api_rate_limit', 'medium', 'API rate limit exceeded for endpoint: ' || endpoint_param, source_ip_param, user_uuid);
  END IF;
END;
$$;

-- RLS Policies for security monitoring
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_ips ENABLE ROW LEVEL SECURITY;

-- Security Events Policies
CREATE POLICY "System can insert security events"
ON public.security_events FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can view company security events"
ON public.security_events FOR SELECT
USING (
  company_id IN (
    SELECT empresa_id FROM public.profiles WHERE id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin'
  )
);

-- Security Alerts Policies
CREATE POLICY "Admins can view security alerts"
ON public.security_alerts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  )
);

-- Login Attempts Policies
CREATE POLICY "System can insert login attempts"
ON public.login_attempts FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can view login attempts"
ON public.login_attempts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  )
);

-- API Usage Logs Policies
CREATE POLICY "System can insert API usage logs"
ON public.api_usage_logs FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can view own API usage"
ON public.api_usage_logs FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Company admins can view company API usage"
ON public.api_usage_logs FOR SELECT
USING (
  company_id IN (
    SELECT empresa_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- Blocked IPs Policies
CREATE POLICY "System can manage blocked IPs"
ON public.blocked_ips FOR ALL
USING (true);

-- Views for security dashboards
CREATE OR REPLACE VIEW public.security_dashboard AS
SELECT 
  DATE_TRUNC('hour', created_at) as hour,
  event_type,
  severity,
  COUNT(*) as count,
  COUNT(DISTINCT source_ip) as unique_ips
FROM public.security_events
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', created_at), event_type, severity
ORDER BY hour DESC;

CREATE OR REPLACE VIEW public.login_attempts_summary AS
SELECT 
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(*) as total_attempts,
  COUNT(CASE WHEN success = true THEN 1 END) as successful_logins,
  COUNT(CASE WHEN success = false THEN 1 END) as failed_logins,
  COUNT(DISTINCT source_ip) as unique_ips
FROM public.login_attempts
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', created_at)
ORDER BY hour DESC;

-- Scheduled job for cleaning old security logs (to be run daily)
CREATE OR REPLACE FUNCTION public.cleanup_old_security_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete security events older than 90 days
  DELETE FROM public.security_events WHERE created_at < NOW() - INTERVAL '90 days';
  
  -- Delete login attempts older than 30 days
  DELETE FROM public.login_attempts WHERE created_at < NOW() - INTERVAL '30 days';
  
  -- Delete API usage logs older than 30 days
  DELETE FROM public.api_usage_logs WHERE created_at < NOW() - INTERVAL '30 days';
  
  -- Unblock expired IPs
  DELETE FROM public.blocked_ips WHERE blocked_until < NOW();
END;
$$;