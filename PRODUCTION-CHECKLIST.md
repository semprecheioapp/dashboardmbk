# 🚀 MBK Dashboard - Checklist Final para Produção

## ✅ **VERIFICAÇÃO CRÍTICA ANTES DO LANÇAMENTO**

### 📋 **ETAPA 1: CONFIGURAÇÃO DE AMBIENTE**

#### 🔑 **Variáveis de Ambiente (OBRIGATÓRIO)**
- [ ] `VITE_SUPABASE_URL` configurada (URL do projeto Supabase)
- [ ] `VITE_SUPABASE_ANON_KEY` configurada (chave pública)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` configurada (chave de serviço)
- [ ] `BREVO_API_KEY` configurada (para emails)
- [ ] `INVITE_FROM_EMAIL` configurada (no-reply@seu-dominio.com.br)
- [ ] `SITE_URL` configurada (https://dashboardmbk.com.br)

#### 🔐 **Configuração Supabase**
- [ ] Projeto Supabase criado em produção
- [ ] Database criado e acessível
- [ ] Authentication configurado
- [ ] Storage configurado para uploads
- [ ] Edge Functions deployadas

### 📊 **ETAPA 2: MIGRAÇÕES E BANCO**

#### 🔄 **Executar Migrações**
```bash
# No ambiente de produção:
supabase db reset --linked
supabase migration up --linked
```

- [ ] Migração `20250817035038_c275f998-5e64-47ca-9a55-235381e034f5.sql` aplicada
- [ ] Migração `20250823000000_lgpd_gdpr_compliance.sql` aplicada
- [ ] Migração `20250823000001_security_monitoring.sql` aplicada
- [ ] Migração `20250823000002_backup_recovery.sql` aplicada

#### 📈 **Verificar Tabelas Criadas**
```sql
-- Verificar tabelas de segurança
SELECT * FROM information_schema.tables WHERE table_name LIKE 'security_%';
SELECT * FROM information_schema.tables WHERE table_name LIKE 'privacy_%';
SELECT * FROM information_schema.tables WHERE table_name LIKE 'backup_%';
```

### 🧪 **ETAPA 3: TESTES DE SEGURANÇA**

#### 🔍 **Testes Obrigatórios**
- [ ] Executar: `node security-tests.js` contra ambiente real
- [ ] Verificar headers de segurança via curl:
```bash
curl -I https://dashboardmbk.com.br | grep -E "(X-Frame-Options|X-Content-Type-Options|Strict-Transport-Security)"
```

#### 🌐 **Testes CORS**
- [ ] Verificar CORS restrito:
```bash
curl -H "Origin: https://malicious-site.com" -I https://dashboardmbk.com.br
```

#### 🔐 **Testes LGPD/GDPR**
- [ ] Testar endpoint: `/api/lgpd-compliance?action=get_legal_documents`
- [ ] Testar criação de solicitação de exportação
- [ ] Testar criação de solicitação de exclusão

### 📧 **ETAPA 4: EMAIL E COMUNICAÇÃO**

#### 📬 **Configuração Brevo**
- [ ] API key Brevo válida inserida
- [ ] Email remetente verificado no Brevo
- [ ] Templates de email criados no Brevo
- [ ] Teste de envio de convite realizado

#### 🎯 **Teste de Convite de Agente**
```bash
curl -X POST "https://your-project.supabase.co/functions/v1/agent-invite-create-with-password" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"email": "test@seu-dominio.com.br", "name": "Teste", "scopes": ["whatsapp:read"]}'
```

### 💾 **ETAPA 5: BACKUP E RECOVERY**

#### 🔄 **Configuração de Backup**
- [ ] Backup schedule criado no Supabase
- [ ] Retention policy configurada (90 dias)
- [ ] Teste de restore realizado
- [ ] Verificação de integridade de backup

#### 📋 **Comandos de Verificação**
```sql
-- Verificar backup schedules
SELECT * FROM public.backup_schedules WHERE enabled = true;

-- Verificar últimos backups
SELECT * FROM public.backup_metadata ORDER BY created_at DESC LIMIT 5;
```

### 🔍 **ETAPA 6: MONITORAMENTO**

#### 📊 **Sistema de Monitoramento**
- [ ] Edge Function `security-monitor` deployada
- [ ] Edge Function `lgpd-compliance` deployada
- [ ] Supabase Analytics ativado
- [ ] Alertas configurados

#### 🔔 **Alertas Configurados**
- [ ] Falhas de login (5+ tentativas)
- [ ] Tentativas de brute force
- [ ] Anomalias de API
- [ ] Falhas de backup

### 🚀 **ETAPA 7: DEPLOY FINAL**

#### 📦 **Deploy no Vercel**
```bash
# Comandos para deploy
vercel --prod
```

- [ ] Projeto conectado ao repositório
- [ ] Environment variables configuradas no Vercel
- [ ] Domínio customizado configurado
- [ ] SSL automático ativado

#### 🌐 **Configuração de Domínio**
- [ ] DNS configurado para apontar para Vercel
- [ ] SSL certificate ativo
- [ ] Redirecionamento HTTP → HTTPS

## 🎯 **COMANDOS DE VERIFICAÇÃO RÁPIDA**

### **1. Verificar Headers de Segurança**
```bash
curl -I https://dashboardmbk.com.br
```

### **2. Testar LGPD**
```bash
curl -X GET "https://dashboardmbk.com.br/api/lgpd-compliance?action=get_legal_documents"
```

### **3. Testar Convite de Agente**
```bash
curl -X POST "https://dashboardmbk.com.br/api/agent-invite-create-with-password" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"email": "novo@agente.com.br", "scopes": ["whatsapp:read"]}'
```

### **4. Verificar Backup**
```bash
curl -X GET "https://dashboardmbk.com.br/api/backup-status"
```

## 🚨 **BLOQUEADORES CRÍTICOS**

### **NÃO PROSSEGUIR SE:**
- [ ] Alguma variável de ambiente estiver faltando
- [ ] Testes de segurança falharem abaixo de 90%
- [ ] LGPD endpoints não estiverem funcionando
- [ ] Email de convite não estiver enviando
- [ ] Backup não estiver configurado

## ✅ **APROVAÇÃO FINAL**

### **Assinatura de Responsável Técnico:**
- [ ] **Verificou todas as variáveis de ambiente** ✅
- [ ] **Executou testes de segurança e passou >90%** ✅
- [ ] **Testou LGPD compliance com sucesso** ✅
- [ ] **Verificou backup e recovery** ✅
- [ ] **Confirmou monitoramento ativo** ✅
- [ ] **Testou fluxo completo de convite** ✅

### **Data de Aprovação:** ________________
### **Nome do Responsável:** ________________
### **Cargo:** ________________

---

## 🎯 **STATUS FINAL**

**SISTEMA ESTÁ:** 
- ⏳ **AGUARDANDO EXECUÇÃO DESTE CHECKLIST**
- 🔒 **100% SEGURO APÓS COMPLETAR TODOS OS ITENS**
- 🚀 **PRONTO PARA RECEBER CLIENTES**

**Executar script de deploy:**
```bash
bash deploy-production.sh
```