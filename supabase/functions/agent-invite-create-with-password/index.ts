import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InviteWithPasswordRequest {
  email: string;
  name?: string;
  role_id?: string;
  scopes: string[];
  temporary_password?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate all environment variables
    const requiredEnvVars = {
      SUPABASE_URL: Deno.env.get('SUPABASE_URL'),
      SUPABASE_ANON_KEY: Deno.env.get('SUPABASE_ANON_KEY'),
      SUPABASE_SERVICE_ROLE_KEY: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
      BREVO_API_KEY: Deno.env.get('BREVO_API_KEY'),
      INVITE_FROM_EMAIL: Deno.env.get('INVITE_FROM_EMAIL') || 'no-reply@yourdomain.com',
      SITE_URL: Deno.env.get('SITE_URL') || 'http://localhost:5173'
    };

    const missingVars = Object.entries(requiredEnvVars)
      .filter(([_, value]) => !value)
      .map(([key, _]) => key);

    if (missingVars.length > 0) {
      console.error('Missing environment variables:', missingVars);
      return new Response(
        JSON.stringify({ error: `Missing environment variables: ${missingVars.join(', ')}` }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const supabase = createClient(
      requiredEnvVars.SUPABASE_URL!,
      requiredEnvVars.SUPABASE_ANON_KEY!,
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
      console.error('Auth error:', authError);
      throw new Error('Usuário não autenticado');
    }
    
    console.log('Authenticated user:', user.id);

    // Get user profile to find company
    const { data: profile } = await supabase
      .from('profiles')
      .select('empresa_id')
      .eq('id', user.id)
      .single();

    if (!profile?.empresa_id) {
      throw new Error('Empresa não encontrada');
    }

    const body: InviteWithPasswordRequest = await req.json();
    const { email, name, role_id, scopes, temporary_password } = body;

    // Validate input
    if (!email || !scopes || scopes.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Email e pelo menos uma permissão são obrigatórios' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check company agent limit
    const { data: limitCheck, error: limitError } = await supabase.rpc('check_company_agent_limit', {
      company_uuid: profile.empresa_id
    });

    console.log('Limit check result:', { limitCheck, limitError });

    if (limitError) {
      console.error('Error checking company limit:', limitError);
      throw new Error('Erro ao verificar limite de agentes');
    }

    if (limitCheck === false || limitCheck === null || limitCheck === 0) {
      throw new Error('Limite de agentes atingido para esta empresa');
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', email)
      .single();

    let newUserId: string;
    let isNewUser = false;
    
    if (existingUser) {
      newUserId = existingUser.id;
    } else {
      // Create new user with Supabase Auth
      const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      if (!serviceRoleKey) {
        console.error('Missing SUPABASE_SERVICE_ROLE_KEY');
        throw new Error('Erro de configuração do servidor');
      }
      
      const adminSupabase = createClient(
        requiredEnvVars.SUPABASE_URL!,
        serviceRoleKey
      );

      const password = temporary_password || crypto.randomUUID().substring(0, 12);
      
      const { data: authUser, error: signUpError } = await adminSupabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          nome: name || email.split('@')[0],
          empresa_id: profile.empresa_id,
          created_via_invite: true
        }
      });

      if (signUpError) {
        console.error('Error creating user:', signUpError);
        throw new Error('Erro ao criar usuário');
      }

      newUserId = authUser.user.id;
      isNewUser = true;

      // Create profile
      const { error: profileError } = await adminSupabase
        .from('profiles')
        .insert({
          id: newUserId,
          email,
          nome: name || email.split('@')[0],
          empresa_id: profile.empresa_id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (profileError) {
        console.error('Error creating profile:', profileError);
        throw new Error('Erro ao criar perfil do usuário');
      }
    }

    // Check if user already is a member
    const { data: existingMember } = await supabase
      .from('membros_empresa')
      .select('id')
      .eq('company_id', profile.empresa_id)
      .eq('user_id', newUserId)
      .maybeSingle();

    if (existingMember) {
      throw new Error('Este usuário já é membro da empresa');
    }

    // Create membership
    const { error: memberError } = await supabase
      .from('membros_empresa')
      .insert({
        company_id: profile.empresa_id,
        user_id: newUserId,
        role_id: role_id,
        scopes: scopes,
        invited_by: user.id,
        status: 'active',
        created_at: new Date().toISOString()
      });

    if (memberError) {
      console.error('Error creating membership:', memberError);
      throw new Error('Erro ao adicionar usuário à empresa');
    }

    // Get company info
    console.log('Getting company info for:', profile.empresa_id, 'type:', typeof profile.empresa_id);
    
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

    // Send welcome email with credentials
    const brevoApiKey = Deno.env.get('BREVO_API_KEY') ?? '';
    const fromEmail = Deno.env.get('INVITE_FROM_EMAIL') ?? 'no-reply@yourdomain.com';
    const loginUrl = `${Deno.env.get('SITE_URL') || 'http://localhost:5173'}/auth`;

    const password = temporary_password || 'senha_gerada_automaticamente';
    
    const emailHtml = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta http-equiv="x-ua-compatible" content="ie=edge" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Bem-vindo(a) à ${company?.name_empresa || 'sua empresa'}</title>
  </head>
  <body style="font-family:Arial, Helvetica, sans-serif; background:#f6f9fc; padding:24px;">
    <div style="max-width:600px; margin:0 auto; background:#ffffff; border-radius:8px; padding:24px;">
      <h2 style="margin:0 0 12px 0;">Bem-vindo(a) à ${company?.name_empresa || 'nossa empresa'}!</h2>
      ${name ? `<p style="margin:0 0 8px 0;">Olá ${name},</p>` : ''}
      <p style="margin:0 0 16px 0;">${inviterProfile?.nome || 'Administrador'} convidou você para acessar o MBK Dashboard.</p>
      
      <div style="background:#f9fafb; border:1px solid #e5e7eb; border-radius:6px; padding:16px; margin:16px 0;">
        <h3 style="margin:0 0 8px 0; font-size:16px;">Suas credenciais de acesso:</h3>
        <p style="margin:4px 0; font-size:14px;"><strong>Email:</strong> ${email}</p>
        <p style="margin:4px 0; font-size:14px;"><strong>Senha:</strong> ${temporary_password || '(senha gerada automaticamente)'}</p>
      </div>
      
      <p style="margin:0 0 24px 0;">Clique no botão abaixo para fazer login:</p>
      <p>
        <a href="${loginUrl}" target="_blank" style="display:inline-block; padding:12px 20px; background:#111827; border-radius:6px; color:#ffffff; text-decoration:none;">Fazer Login</a>
      </p>
      
      <div style="background:#fef3c7; border:1px solid #f59e0b; border-radius:6px; padding:12px; margin:16px 0;">
        <p style="margin:0; font-size:14px; color:#92400e;"><strong>Importante:</strong> Você deve trocar sua senha no primeiro acesso.</p>
      </div>
      
      <p style="color:#6b7280; margin-top:24px;">Se o botão não funcionar, acesse: ${loginUrl}</p>
    </div>
  </body>
</html>`;

    let emailSent = false;
    try {
      const emailPayload = {
        sender: { name: 'MBK Dashboard', email: fromEmail },
        to: [{ email, name: name || email }],
        subject: `Bem-vindo(a) à ${company?.name_empresa || 'sua empresa'} - Acesso ao Dashboard`,
        htmlContent: emailHtml
      };
      
      const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': brevoApiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(emailPayload)
      });
      
      if (brevoRes.ok) {
        emailSent = true;
      } else {
        console.error('Brevo send error:', await brevoRes.text());
      }
    } catch (e) {
      console.error('Error sending via Brevo:', e);
    }

    // Log audit
    await supabase.rpc('audit_log', {
      actor_id: user.id,
      company_uuid: profile.empresa_id,
      action_name: 'agent_invite_created_with_password',
      target_type_name: 'membro_empresa',
      target_uuid: newUserId,
      metadata_json: { 
        email, 
        scopes, 
        is_new_user: isNewUser,
        temporary_password_provided: !!temporary_password 
      }
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        user_id: newUserId,
        is_new_user: isNewUser,
        message: `Usuário ${isNewUser ? 'criado e adicionado' : 'adicionado'} à empresa com sucesso`,
        email_sent: emailSent,
        credentials_sent_to: email
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in agent-invite-create-with-password:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack || 'No stack trace available'
      }),
      { 
        status: error.message.includes('Limite') ? 409 : 
               error.message.includes('autenticado') ? 401 : 
               error.message.includes('configuração') ? 500 : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
};

serve(handler);