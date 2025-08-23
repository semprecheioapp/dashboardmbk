import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.54.0";
import { getCorsHeaders } from '../shared/security.ts';

const handler = async (req: Request): Promise<Response> => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
        global: {
          headers: {
            Authorization: req.headers.get('Authorization') ?? '',
          },
        },
      }
    );

    // Get user from auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Usuário não autenticado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    switch (action) {
      case 'get_consent_status':
        return await getConsentStatus(supabase, user.id, corsHeaders);
      
      case 'update_consent':
        return await updateConsent(supabase, user.id, req, corsHeaders);
      
      case 'create_export_request':
        return await createExportRequest(supabase, user.id, corsHeaders);
      
      case 'create_deletion_request':
        return await createDeletionRequest(supabase, user.id, req, corsHeaders);
      
      case 'get_privacy_settings':
        return await getPrivacySettings(supabase, user.id, corsHeaders);
      
      case 'update_privacy_settings':
        return await updatePrivacySettings(supabase, user.id, req, corsHeaders);
      
      case 'get_legal_documents':
        return await getLegalDocuments(supabase, corsHeaders);
      
      default:
        return new Response(
          JSON.stringify({ error: 'Ação inválida' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

  } catch (error) {
    console.error('Error in lgpd-compliance:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

async function getConsentStatus(supabase: any, userId: string, corsHeaders: any) {
  const { data, error } = await supabase.rpc('get_user_consent_status', {
    user_uuid: userId
  });

  if (error) {
    throw new Error('Erro ao obter status de consentimento');
  }

  return new Response(
    JSON.stringify({ consent_status: data }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function updateConsent(supabase: any, userId: string, req: Request, corsHeaders: any) {
  const body = await req.json();
  const { consent_type, consent_given, version } = body;

  if (!consent_type || consent_given === undefined || !version) {
    return new Response(
      JSON.stringify({ error: 'Dados de consentimento inválidos' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
  const userAgent = req.headers.get('user-agent') || '';

  const { error } = await supabase.from('privacy_consents').insert({
    user_id: userId,
    consent_type,
    version,
    consent_given,
    ip_address: clientIP,
    user_agent: userAgent
  });

  if (error) {
    throw new Error('Erro ao atualizar consentimento');
  }

  // Log the consent update
  await supabase.rpc('audit_log', {
    actor_id: userId,
    company_uuid: null,
    action_name: 'consent_updated',
    target_type_name: 'privacy_consents',
    target_uuid: null,
    metadata_json: { consent_type, consent_given, version }
  });

  return new Response(
    JSON.stringify({ success: true, message: 'Consentimento atualizado com sucesso' }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function createExportRequest(supabase: any, userId: string, corsHeaders: any) {
  try {
    const { data: requestId, error } = await supabase.rpc('create_data_export_request', {
      user_uuid: userId
    });

    if (error) {
      throw new Error(error.message);
    }

    // Log the export request
    await supabase.rpc('audit_log', {
      actor_id: userId,
      company_uuid: null,
      action_name: 'data_export_requested',
      target_type_name: 'data_export_requests',
      target_uuid: requestId,
      metadata_json: { request_id: requestId }
    });

    return new Response(
      JSON.stringify({ success: true, request_id: requestId, message: 'Solicitação de exportação criada' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function createDeletionRequest(supabase: any, userId: string, req: Request, corsHeaders: any) {
  const body = await req.json();
  const { deletion_type = 'full_deletion', justification } = body;

  try {
    const { data: requestId, error } = await supabase.rpc('create_data_deletion_request', {
      user_uuid: userId,
      deletion_type,
      justification
    });

    if (error) {
      throw new Error(error.message);
    }

    // Log the deletion request
    await supabase.rpc('audit_log', {
      actor_id: userId,
      company_uuid: null,
      action_name: 'data_deletion_requested',
      target_type_name: 'data_deletion_requests',
      target_uuid: requestId,
      metadata_json: { deletion_type, justification }
    });

    return new Response(
      JSON.stringify({ success: true, request_id: requestId, message: 'Solicitação de exclusão criada' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function getPrivacySettings(supabase: any, userId: string, corsHeaders: any) {
  const { data, error } = await supabase
    .from('privacy_settings')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error('Erro ao obter configurações de privacidade');
  }

  const defaultSettings = {
    marketing_emails: true,
    analytics_tracking: true,
    chat_data_retention: true,
    personalized_ads: true,
    data_sharing: false
  };

  return new Response(
    JSON.stringify({ privacy_settings: data || defaultSettings }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function updatePrivacySettings(supabase: any, userId: string, req: Request, corsHeaders: any) {
  const body = await req.json();
  
  const { error } = await supabase.from('privacy_settings').upsert({
    user_id: userId,
    ...body,
    updated_at: new Date().toISOString()
  });

  if (error) {
    throw new Error('Erro ao atualizar configurações de privacidade');
  }

  return new Response(
    JSON.stringify({ success: true, message: 'Configurações de privacidade atualizadas' }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function getLegalDocuments(supabase: any, corsHeaders: any) {
  const { data, error } = await supabase
    .from('legal_documents')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error('Erro ao obter documentos legais');
  }

  return new Response(
    JSON.stringify({ legal_documents: data }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

serve(handler);