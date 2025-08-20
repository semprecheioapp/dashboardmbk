import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.54.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AcceptRequest {
  token: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    );

    const { token }: AcceptRequest = await req.json();

    if (!token) {
      throw new Error('Token é obrigatório');
    }

    console.log('Processing token:', token)
    console.log('Accepting invite with token_hash:', token)

    // Buscar o convite pelo token_hash (campo correto)
    const { data: invite, error: inviteError } = await supabase
      .from('convites_empresa')
      .select(`
        *,
        empresas!inner(name_empresa)
      `)
      .eq('token_hash', token)
      .eq('status', 'pending')
      .single();

    if (inviteError || !invite) {
      console.log('Invite error:', inviteError);
      console.log('Invite data:', invite);
      
      // Tentar buscar com status diferente para debugging
      const { data: debugInvite } = await supabase
        .from('convites_empresa')
        .select('id, token_hash, status, email, expires_at')
        .eq('token_hash', token)
        .single();
      
      console.log('Debug invite:', debugInvite);
      
      throw new Error(`Convite não encontrado ou já utilizado. Status: ${debugInvite?.status || 'não encontrado'}`);
    }

    // Check if invite is expired
    if (new Date(invite.expires_at) < new Date()) {
      await supabase
        .from('convites_empresa')
        .update({ status: 'expired' })
        .eq('id', invite.id);
      
      throw new Error('Convite expirado');
    }

    // Get authorization header for current user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Autorização requerida');
    }

    // Set auth for the request
    const userSupabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    );
    userSupabase.auth.setAuth(authHeader.replace('Bearer ', ''));

    // Get current user
    const { data: { user }, error: authError } = await userSupabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Usuário não autenticado');
    }

    // Check if user email matches invite (case-insensitive)
    const userEmail = user.email?.toLowerCase().trim();
    const inviteEmail = invite.email?.toLowerCase().trim();
    
    console.log('User email:', userEmail);
    console.log('Invite email:', inviteEmail);
    
    if (userEmail !== inviteEmail) {
      throw new Error(`Este convite é para o e-mail: ${inviteEmail}, mas você está logado com: ${userEmail}`);
    }

    // Check if user already is a member
    const { data: existingMember } = await supabase
      .from('membros_empresa')
      .select('id')
      .eq('company_id', invite.company_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingMember) {
      throw new Error('Você já é membro desta empresa');
    }

    // Create membership
    const { error: memberError } = await supabase
      .from('membros_empresa')
      .insert({
        company_id: invite.company_id,
        user_id: user.id,
        role_id: invite.role_id,
        scopes: invite.scopes,
        invited_by: invite.invited_by,
        status: 'active'
      });

    if (memberError) {
      console.error('Error creating membership:', memberError);
      throw new Error('Erro ao criar membro da empresa');
    }

    // Update invite status
    const { error: updateError } = await supabase
      .from('convites_empresa')
      .update({ 
        status: 'accepted',
        accepted_by: user.id
      })
      .eq('id', invite.id);

    if (updateError) {
      console.error('Error updating invite:', updateError);
    }

    // Log audit
    await supabase.rpc('audit_log', {
      actor_id: user.id,
      company_uuid: invite.company_id,
      action_name: 'agent_invite_accepted',
      target_type_name: 'convite_empresa',
      target_uuid: invite.id,
      metadata_json: { email: invite.email }
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        company_name: invite.empresas.name_empresa,
        message: 'Convite aceito com sucesso' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in agent-invite-accept:', error);
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