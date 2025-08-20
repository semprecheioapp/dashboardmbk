import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.54.0";
// Using Brevo API via HTTPS — no Resend import


const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InviteRequest {
  email: string;
  name?: string;
  role_id?: string;
  scopes: string[];
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Rate limiting simples
  const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
  const rateLimitKey = `invite_create:${clientIP}`;
  
  // Verificar rate limit (implementação básica)
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutos
  const maxRequests = 5;

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

    const body: InviteRequest = await req.json();
    const { email, name, role_id, scopes } = body;

    // Validate input
    if (!email || !scopes) {
      throw new Error('Email e permissões são obrigatórios');
    }

    // Check company agent limit
    const { data: limitCheck } = await supabase.rpc('check_company_agent_limit', {
      company_uuid: profile.empresa_id
    });

    if (!limitCheck) {
      throw new Error('Limite de agentes atingido para esta empresa');
    }

    // Check if user already has an active invite or membership
    const { data: existingInvite } = await supabase
      .from('convites_empresa')
      .select('id')
      .eq('company_id', profile.empresa_id)
      .eq('email', email)
      .eq('status', 'pending')
      .maybeSingle();

    const { data: existingMember } = await supabase
      .from('membros_empresa')
      .select('id')
      .eq('company_id', profile.empresa_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingInvite) {
      throw new Error('Já existe um convite pendente para este e-mail');
    }

    if (existingMember) {
      throw new Error('Este usuário já é membro da empresa');
    }

    // Generate secure token (UUID direto)
    const token = crypto.randomUUID();
    const hashHex = token; // Usar UUID direto sem hash

    // Create invite
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    const { data: invite, error: inviteError } = await supabase
      .from('convites_empresa')
      .insert({
        company_id: profile.empresa_id,
        email,
        name,
        role_id,
        scopes,
        token_hash: hashHex,
        expires_at: expiresAt.toISOString(),
        invited_by: user.id
      })
      .select()
      .single();

    if (inviteError) {
      console.error('Error creating invite:', inviteError);
      throw new Error('Erro ao criar convite');
    }

    // Get company info and inviter profile for email
    const { data: company } = await supabase
      .from('empresas')
      .select('name_empresa')
      .eq('id', profile.empresa_id)
      .single();

    const { data: inviterProfile } = await supabase
      .from('profiles')
      .select('nome')
      .eq('id', user.id)
      .single();

    // Send invitation email using Brevo API
    const brevoApiKey = Deno.env.get('BREVO_API_KEY') ?? '';
    const fromEmail = Deno.env.get('INVITE_FROM_EMAIL') ?? 'no-reply@yourdomain.com';
    const acceptUrl = `${Deno.env.get('SITE_URL') || 'http://localhost:5173'}/accept-invite?token=${hashHex}`;

    console.log('Email send attempt:', {
      brevoApiKey: brevoApiKey ? 'PRESENT' : 'MISSING',
      fromEmail,
      toEmail: email,
      acceptUrl
    });

    const emailHtml = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta http-equiv="x-ua-compatible" content="ie=edge" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Convite para ${company?.name_empresa || 'a empresa'}</title>
  </head>
  <body style="font-family:Arial, Helvetica, sans-serif; background:#f6f9fc; padding:24px;">
    <div style="max-width:600px; margin:0 auto; background:#ffffff; border-radius:8px; padding:24px;">
      <h2 style="margin:0 0 12px 0;">Você foi convidado(a) para ${company?.name_empresa || 'nossa empresa'}</h2>
      ${name ? `<p style=\"margin:0 0 8px 0;\">Olá ${name},</p>` : ''}
      <p style="margin:0 0 16px 0;">${inviterProfile?.nome || 'Administrador'} convidou você para acessar o MBK Dashboard.</p>
      <p style="margin:0 0 24px 0;">Clique no botão abaixo para aceitar o convite:</p>
      <p>
        <a href="${acceptUrl}" target="_blank" style="display:inline-block; padding:12px 20px; background:#111827; border-radius:6px; color:#ffffff; text-decoration:none;">Aceitar convite</a>
      </p>
      <p style="color:#6b7280; margin-top:24px;">Se o botão não funcionar, copie e cole este link no seu navegador:<br />${acceptUrl}</p>
    </div>
  </body>
</html>`;

    let emailSent = false;
    try {
      const emailPayload = {
        sender: { name: 'MBK Dashboard', email: fromEmail },
        to: [{ email, name: name || email }],
        subject: `Convite para ${company?.name_empresa || 'a empresa'}`,
        htmlContent: emailHtml
      };
      
      console.log('Sending email via Brevo with payload:', JSON.stringify(emailPayload, null, 2));
      
      const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': brevoApiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(emailPayload)
      });
      
      const responseText = await brevoRes.text();
      console.log('Brevo response:', {
        status: brevoRes.status,
        statusText: brevoRes.statusText,
        response: responseText
      });
      
      if (brevoRes.ok) {
        emailSent = true;
        console.log('Email sent successfully via Brevo');
      } else {
        console.error('Brevo send error:', brevoRes.status, responseText);
      }
    } catch (e) {
      console.error('Error sending via Brevo:', e);
    }

    // Log audit
    await supabase.rpc('audit_log', {
      actor_id: user.id,
      company_uuid: profile.empresa_id,
      action_name: 'agent_invite_created',
      target_type_name: 'convite_empresa',
      target_uuid: invite.id,
      metadata_json: { email, scopes }
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        invite_id: invite.id,
        message: `Convite ${emailSent ? 'enviado' : 'criado (email não enviado)'}`,
        email_sent: emailSent
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in agent-invite-create:', error);
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