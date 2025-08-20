# Agent Invite Create with Password

## Descrição
Edge Function para criar agentes diretamente com senha pré-definida, eliminando a necessidade de convites separados.

## Como fazer deploy

### Opção 1: Supabase CLI
```bash
# Entrar no diretório do projeto
cd /path/to/dashboardmbk

# Fazer login no Supabase CLI
supabase login

# Linkar projeto
supabase link --project-ref mycjqmnvyphnarjoriux

# Deploy da função
supabase functions deploy agent-invite-create-with-password --no-verify-jwt
```

### Opção 2: Dashboard do Supabase
1. Acesse: https://app.supabase.com/project/mycjqmnvyphnarjoriux/functions
2. Clique em "Deploy from Git"
3. Selecione a função `agent-invite-create-with-password`
4. Configure: No JWT verification
5. Clique em "Deploy"

## Uso

### Request
```json
POST https://mycjqmnvyphnarjoriux.supabase.co/functions/v1/agent-invite-create-with-password
Headers:
  Authorization: Bearer <JWT_TOKEN>
  Content-Type: application/json

Body:
{
  "email": "novo@agente.com",
  "name": "Nome do Agente",
  "scopes": ["read:leads", "write:leads"],
  "temporary_password": "senha123" // opcional
}
```

### Response
```json
{
  "success": true,
  "user_id": "uuid-do-usuario",
  "is_new_user": true,
  "message": "Usuário criado e adicionado à empresa com sucesso",
  "email_sent": true,
  "credentials_sent_to": "novo@agente.com"
}
```

## Variáveis de ambiente necessárias
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `BREVO_API_KEY`
- `INVITE_FROM_EMAIL`
- `SITE_URL`