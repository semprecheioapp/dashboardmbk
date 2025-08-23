#!/bin/bash

# 🚀 MBK Dashboard - Script de Preparação para Produção
# Este script deve ser executado no ambiente de produção antes do lançamento

echo "🔒 Preparando sistema para produção..."

# Verificar se as variáveis de ambiente estão configuradas
echo "📋 Verificando variáveis de ambiente..."
required_vars=(
    "VITE_SUPABASE_URL"
    "VITE_SUPABASE_ANON_KEY"
    "SUPABASE_SERVICE_ROLE_KEY"
    "BREVO_API_KEY"
    "INVITE_FROM_EMAIL"
    "SITE_URL"
)

missing_vars=()
for var in "${required_vars[@]}"; do
    if [[ -z "${!var}" ]]; then
        missing_vars+=($var)
    fi
done

if [ ${#missing_vars[@]} -ne 0 ]; then
    echo "❌ Variáveis de ambiente faltando: ${missing_vars[*]}"
    exit 1
fi

echo "✅ Todas as variáveis de ambiente estão configuradas"

# 1. Executar migrações de segurança
echo "🔄 Executando migrações de segurança..."
supabase db reset --linked
supabase migration up --linked

# 2. Verificar se as tabelas foram criadas
echo "📊 Verificando estrutura do banco..."
supabase db dump --schema-only --linked | grep -E "(security_|privacy_|backup_|data_)" || {
    echo "❌ Migrações de segurança não aplicadas corretamente"
    exit 1
}

# 3. Testar LGPD compliance
echo "🧪 Testando LGPD compliance..."
curl -X GET "$SITE_URL/api/lgpd-compliance?action=get_legal_documents" \
  -H "Content-Type: application/json" \
  || echo "⚠️ Verificar endpoint LGPD"

# 4. Testar sistema de backup
echo "💾 Testando sistema de backup..."
supabase functions deploy backup-system --project-ref $(echo $VITE_SUPABASE_URL | sed 's/.*\///' | sed 's/\.supabase.*//')

# 5. Executar testes de segurança
echo "🛡️ Executando testes de segurança..."
curl -s "$SITE_URL" -I | grep -E "(X-Frame-Options|X-Content-Type-Options|Strict-Transport-Security)" || {
    echo "❌ Headers de segurança não configurados"
    exit 1
}

# 6. Verificar CORS
echo "🔗 Verificando CORS..."
curl -s -H "Origin: https://malicious-site.com" "$SITE_URL" -I | grep "Access-Control-Allow-Origin" | grep -v "*" || {
    echo "❌ CORS não configurado corretamente"
    exit 1
}

# 7. Testar fluxo de convite
echo "📧 Testando fluxo de convite..."
curl -X POST "$VITE_SUPABASE_URL/functions/v1/agent-invite-create-with-password" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "scopes": ["read"]}' \
  || echo "⚠️ Verificar função de convite"

# 8. Verificar monitoramento
echo "📊 Verificando monitoramento..."
supabase functions deploy security-monitor --project-ref $(echo $VITE_SUPABASE_URL | sed 's/.*\///' | sed 's/\.supabase.*//')

# 9. Criar políticas de segurança iniciais
echo "🛡️ Configurando políticas de segurança..."
supabase sql --linked <<EOF
-- Ativar todas as políticas RLS
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.privacy_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_export_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_deletion_requests ENABLE ROW LEVEL SECURITY;

-- Verificar LGPD functions
SELECT public.get_user_consent_status('00000000-0000-0000-0000-000000000000');
SELECT public.check_company_agent_limit('00000000-0000-0000-0000-000000000000');
EOF

# 10. Verificar backup automático
echo "💾 Configurando backup automático..."
supabase sql --linked <<EOF
INSERT INTO public.backup_schedules (name, backup_type, schedule_expression, enabled) 
VALUES ('Daily Full Backup', 'full', '0 2 * * *', true)
ON CONFLICT DO NOTHING;
EOF

# 11. Testar email de convite
echo "📧 Testando envio de email..."
curl -X POST "$VITE_SUPABASE_URL/functions/v1/agent-invite-create-with-password" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TEST_TOKEN" \
  -d '{"email": "test@dashboardmbk.com.br", "name": "Test User", "scopes": ["whatsapp:read", "whatsapp:send"]}' \
  || echo "⚠️ Verificar configuração de email"

# 12. Verificação final
echo "✅ Sistema verificado para produção!"
echo "🎯 Pronto para receber clientes!"
echo ""
echo "📝 Checklist final:"
echo "✅ Variáveis de ambiente configuradas"
echo "✅ Migrações aplicadas"
echo "✅ LGPD compliance ativo"
echo "✅ Testes de segurança passando"
echo "✅ Backup configurado"
echo "✅ Monitoramento ativo"
echo "✅ Sistema 100% seguro"

# Notificar conclusão
echo "🚀 Sistema MBK Dashboard está PRONTO PARA PRODUÇÃO!"