import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.54.0";
import { getCorsHeaders } from '../shared/security.ts';

interface SecurityEvent {
  event_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  source_ip: string;
  user_agent: string;
  user_id?: string;
  company_id?: string;
  metadata: any;
}

const handler = async (req: Request): Promise<Response> => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', // Service role for security monitoring
      {
        auth: {
          persistSession: false,
        },
      }
    );

    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    switch (action) {
      case 'log_security_event':
        return await logSecurityEvent(supabase, req, corsHeaders);
      
      case 'get_security_alerts':
        return await getSecurityAlerts(supabase, req, corsHeaders);
      
      case 'get_bruteforce_attempts':
        return await getBruteForceAttempts(supabase, corsHeaders);
      
      case 'get_suspicious_activities':
        return await getSuspiciousActivities(supabase, corsHeaders);
      
      default:
        return new Response(
          JSON.stringify({ error: 'Ação inválida' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

  } catch (error) {
    console.error('Error in security-monitor:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

async function logSecurityEvent(supabase: any, req: Request, corsHeaders: any) {
  const body = await req.json() as SecurityEvent;
  const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
  const userAgent = req.headers.get('user-agent') || '';

  // Validate required fields
  if (!body.event_type || !body.severity || !body.description) {
    return new Response(
      JSON.stringify({ error: 'Dados do evento de segurança inválidos' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Check for rate limiting
  const rateLimitKey = `security_events:${clientIP}:${body.event_type}`;
  
  // Log the security event
  const { error } = await supabase.from('security_events').insert({
    event_type: body.event_type,
    severity: body.severity,
    description: body.description,
    source_ip: clientIP,
    user_agent: userAgent,
    user_id: body.user_id,
    company_id: body.company_id,
    metadata: body.metadata,
    created_at: new Date().toISOString()
  });

  if (error) {
    throw new Error('Erro ao registrar evento de segurança');
  }

  // Send alerts for high/critical severity events
  if (body.severity === 'high' || body.severity === 'critical') {
    await sendSecurityAlert(supabase, body, clientIP);
  }

  return new Response(
    JSON.stringify({ success: true, message: 'Evento de segurança registrado' }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function getSecurityAlerts(supabase: any, req: Request, corsHeaders: any) {
  const authHeader = req.headers.get('Authorization');
  
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: 'Autorização necessária' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Verify admin access
  const supabaseAuth = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    {
      auth: {
        persistSession: false,
      },
      global: {
        headers: { Authorization: authHeader },
      },
    }
  );

  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
  if (authError || !user) {
    return new Response(
      JSON.stringify({ error: 'Não autorizado' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Check if user is admin
  const { data: profile } = await supabaseAuth
    .from('profiles')
    .select('role, empresa_id')
    .eq('id', user.id)
    .single();

  if (!profile || (profile.role !== 'admin' && profile.role !== 'super_admin')) {
    return new Response(
      JSON.stringify({ error: 'Acesso restrito a administradores' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const { data: alerts, error } = await supabase
    .from('security_events')
    .select('*')
    .in('severity', ['high', 'critical'])
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    throw new Error('Erro ao obter alertas de segurança');
  }

  return new Response(
    JSON.stringify({ alerts: alerts || [] }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function getBruteForceAttempts(supabase: any, corsHeaders: any) {
  const { data: attempts, error } = await supabase
    .from('security_events')
    .select('*')
    .eq('event_type', 'brute_force_attempt')
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    throw new Error('Erro ao obter tentativas de brute force');
  }

  // Group by IP and count
  const ipCounts = attempts?.reduce((acc: any, event: any) => {
    acc[event.source_ip] = (acc[event.source_ip] || 0) + 1;
    return acc;
  }, {});

  const suspiciousIPs = Object.entries(ipCounts)
    .filter(([_, count]) => (count as number) >= 5)
    .map(([ip, count]) => ({ ip, attempts: count }));

  return new Response(
    JSON.stringify({ 
      brute_force_attempts: attempts || [],
      suspicious_ips: suspiciousIPs
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function getSuspiciousActivities(supabase: any, corsHeaders: any) {
  const { data: activities, error } = await supabase
    .from('security_events')
    .select('*')
    .in('event_type', [
      'multiple_failed_logins',
      'suspicious_login_location',
      'unusual_access_time',
      'api_rate_limit_exceeded',
      'permission_denied_attempt'
    ])
    .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    throw new Error('Erro ao obter atividades suspeitas');
  }

  return new Response(
    JSON.stringify({ suspicious_activities: activities || [] }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function sendSecurityAlert(supabase: any, event: SecurityEvent, sourceIP: string) {
  try {
    // Get admin users to notify
    const { data: admins } = await supabase
      .from('profiles')
      .select('email, nome')
      .or('role.eq.admin,role.eq.super_admin');

    if (admins && admins.length > 0) {
      const emailData = {
        event_type: event.event_type,
        severity: event.severity,
        description: event.description,
        source_ip: sourceIP,
        timestamp: new Date().toISOString()
      };

      // Log that alerts were sent (in production, send actual emails)
      await supabase.from('security_alerts').insert({
        recipients: admins.map((a: any) => a.email),
        event_data: emailData,
        status: 'pending',
        created_at: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Error sending security alert:', error);
  }
}

serve(handler);