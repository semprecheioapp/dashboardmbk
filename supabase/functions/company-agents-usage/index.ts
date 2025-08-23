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
      throw new Error('Usuário não autenticado');
    }

    // Get user profile to find company
    const { data: profile } = await supabase
      .from('profiles')
      .select('empresa_id')
      .eq('id', user.id)
      .single();

    if (!profile?.empresa_id) {
      throw new Error('Empresa não encontrada');
    }

    // Get company agent usage
    const { data: usage } = await supabase.rpc('get_company_agent_usage', {
      company_uuid: profile.empresa_id
    });

    // Get active members details
    const { data: members } = await supabase
      .from('membros_empresa')
      .select(`
        id,
        user_id,
        status,
        created_at,
        profiles!inner(nome, email)
      `)
      .eq('company_id', profile.empresa_id)
      .eq('status', 'active');

    // Get pending invites
    const { data: invites } = await supabase
      .from('convites_empresa')
      .select('id, email, name, created_at, expires_at')
      .eq('company_id', profile.empresa_id)
      .eq('status', 'pending');

    return new Response(
      JSON.stringify({ 
        usage: usage || { used: 0, limit: null, can_invite: true },
        active_members: members || [],
        pending_invites: invites || []
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in company-agents-usage:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
};

serve(handler);