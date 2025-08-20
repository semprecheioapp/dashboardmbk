import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    )

    const { token } = await req.json()

    if (!token) {
      throw new Error('Token é obrigatório')
    }

    console.log('Validating token:', token)
    console.log('Searching for invite with token_hash:', token)

    // Buscar o convite pelo token_hash (campo correto)
    const { data: invite, error } = await supabaseClient
      .from('convites_empresa')
      .select(`
        *,
        empresas!inner(name_empresa)
      `)
      .eq('token_hash', token)
      .eq('status', 'pending')
      .single()

    console.log('Preview invite data:', invite)
    console.log('Preview error:', error)

    if (error || !invite) {
      throw new Error('Convite não encontrado ou inválido')
    }

    if (new Date(invite.expires_at) < new Date()) {
      throw new Error('Convite expirado')
    }

    return new Response(
      JSON.stringify({ 
        email: invite.email,
        company_name: invite.empresas.name_empresa,
        valid: true,
        token: token
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error: any) {
    return new Response(
      JSON.stringify({ 
        error: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})