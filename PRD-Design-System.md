# 📋 PRD COMPLETO - Sistema Dashboard MBK (Lead Metrics Vista)

## 🎯 Visão Geral do Sistema

**Nome do Produto**: Dashboard MBK - CRM com IA para WhatsApp Business  
**Modelo**: SaaS Multi-tenant  
**Público-alvo**: Pequenas e médias empresas brasileiras  
**Diferencial**: Integração nativa com WhatsApp Business + IA para automação  

## 🏗️ Arquitetura Completa

### Stack Tecnológico
- **Frontend**: React 18.3.1 + TypeScript + Vite
- **Backend**: Supabase (PostgreSQL 15 + Edge Functions)
- **Autenticação**: JWT via Supabase Auth
- **Email**: SMTP Brevo (Sendinblue)
- **Deploy**: Vercel (frontend) + Supabase (backend)
- **Estado**: React Query + Context API
- **Estilo**: Tailwind CSS + Shadcn/ui

### Infraestrutura
- **Database**: PostgreSQL multi-tenant com RLS
- **Edge Functions**: 13 funções serverless
- **Migrations**: 30+ arquivos de schema
- **Storage**: Supabase Storage para uploads
- **Realtime**: Supabase Realtime para notificações

## 🚀 Funcionalidades Completas

### 1. Sistema de Autenticação
- ✅ **Cadastro com email confirmação** (corrigido)
- ✅ **Login com magic links**
- ✅ **Sistema de convites** (tradicional e com senha)
- ✅ **Multi-tenant por empresa**
- ✅ **Role-based access (user/admin/super_admin)**

### 2. Gestão de Empresas
- ✅ **Criação de empresas**
- ✅ **Limite de agentes por empresa**
- ✅ **Configuração de planos**
- ✅ **Gestão de membros da empresa**

### 3. Sistema de Leads
- ✅ **Pipeline Kanban completo**
- ✅ **Campos dinâmicos de lead**
- ✅ **Follow-up automatizado**
- ✅ **Agendamento de compromissos**
- ✅ **Histórico de interações**

### 4. Integração WhatsApp Business
- ✅ **Conexão com WhatsApp Web**
- ✅ **Chrome extension para captura**
- ✅ **Webhook para mensagens**
- ✅ **Templates de mensagens**
- ✅ **Análise de conversas com IA**

### 5. Dashboard e Analytics
- ✅ **Métricas em tempo real**
- ✅ **Gráficos interativos**
- ✅ **Relatórios customizáveis**
- ✅ **Exportação de dados**

### 6. Sistema de Convites
- ✅ **Convite tradicional** (aceitar depois)
- ✅ **Convite com senha** (login direto)
- ✅ **Emails automáticos com credenciais**
- ✅ **Gestão de permissões**

## 🎨 Design System Completo

### Cores e Identidade Visual
```css
--primary: 263 96% 55%   /* Roxo vibrante */
--secondary: 217 91% 60% /* Azul complementar */
--accent: 210 40% 96.1% /* Cinza claro */
--background: 0 0% 100% /* Branco */
--foreground: 222.2 84% 4.9% /* Quase preto */
--success: 142.1 76.2% 36.3% /* Verde */
--warning: 32.2 94.6% 43.7% /* Laranja */
--destructive: 0 84.2% 60.2% /* Vermelho */
```

### Componentes Base
- **Shadcn/ui**: 50+ componentes pre-built
- **MagicUI**: Animações avançadas
- **React Query**: 33+ hooks customizados
- **Icons**: Lucide React
- **Charts**: Recharts para dashboards

### Layout Responsivo
- **Breakpoints**: Mobile-first (sm, md, lg, xl)
- **Touch targets**: Mínimo 44x44px
- **Font sizes**: Ajustado para mobile
- **Dark mode**: Suporte completo

## 🛠️ Configurações de Deploy

### Ambiente de Produção
- **URL Principal**: https://dashboardmbk.com.br
- **Supabase Project**: mycjqmnvyphnarjoriux
- **SMTP**: Brevo (smtp-relay.brevo.com:587)
- **Email Sender**: suporte@dashboardmbk.com.br

### Variáveis de Ambiente
```bash
# Supabase
VITE_SUPABASE_URL=https://mycjqmnvyphnarjoriux.supabase.co
VITE_SUPABASE_ANON_KEY=[key-produção]

# SMTP Config
SUPABASE_SMTP_HOST=smtp-relay.brevo.com
SUPABASE_SMTP_PORT=587
SUPABASE_SMTP_USER=94d920001@smtp-brevo.com
SUPABASE_SMTP_PASS=[senha-brevo]
SUPABASE_SMTP_SENDER=suporte@dashboardmbk.com.br
```

## 📊 Modelo de Negócio

### Pricing Strategy
- **Starter**: R$ 200/mês (até 3 agentes)
- **Professional**: R$ 350/mês (até 10 agentes)
- **Enterprise**: R$ 500/mês (agentes ilimitados)

### Limites por Plano
- **Starter**: 3 agentes, 1000 leads/mês
- **Professional**: 10 agentes, 5000 leads/mês
- **Enterprise**: Ilimitado

## 🔐 Segurança e Compliance

### Segurança de Dados
- ✅ **Row Level Security (RLS)** em todas as tabelas
- ✅ **50+ policies** de isolamento por empresa
- ✅ **JWT tokens** com expiração configurável
- ✅ **Rate limiting** nas APIs
- ✅ **CORS** configurado adequadamente

### Privacidade
- ✅ **GDPR compliance** através de RLS
- ✅ **Exclusão de dados** por empresa
- ✅ **Anonimização** de dados sensíveis
- ✅ **Logs de auditoria** completos

## 📱 Integrações Disponíveis

### APIs Integradas
- **WhatsApp Business API** via webhook
- **OpenAI GPT** para análise de conversas
- **Brevo SMTP** para emails transacionais
- **Chrome Extension** para WhatsApp Web

### Webhooks Configurados
- `/webhook/whatsapp` - Recebe mensagens
- `/webhook/lead-status` - Atualizações de lead
- `/webhook/followup` - Follow-up automático

## 🎯 Funcionalidades por Tipo de Usuário

### Super Admin
- ✅ **Dashboard global** de todas as empresas
- ✅ **Gestão de planos e cobranças**
- ✅ **Acesso a logs de sistema**
- ✅ **Configuração de integrações**

### Admin Empresa
- ✅ **Gestão completa da empresa**
- ✅ **Convidar agentes**
- ✅ **Configurar WhatsApp**
- ✅ **Ver todas as métricas**

### Agente
- ✅ **Gestão de próprios leads**
- ✅ **Chat via WhatsApp**
- ✅ **Agenda de follow-ups**
- ✅ **Métricas pessoais**

## 🚀 Tecnologias e Dependências

### Frontend Dependencies
```json
{
  "react": "^18.3.1",
  "@tanstack/react-query": "^5.59.16",
  "tailwindcss": "^3.4.14",
  "lucide-react": "^0.454.0",
  "react-router-dom": "^6.27.0"
}
```

### Backend (Supabase)
```json
{
  "@supabase/supabase-js": "^2.54.0",
  "supabase": "^1.223.10"
}
```

### Dev Tools
- **ESLint**: Linting configurado
- **TypeScript**: Type checking completo
- **Prettier**: Formatação automática
- **Husky**: Git hooks

## 📋 Checklist de Implantação

### Preparação
- [ ] Configurar Supabase projeto
- [ ] Configurar SMTP Brevo
- [ ] Configurar domínio e SSL
- [ ] Configurar variáveis de ambiente

### Deploy
- [ ] Deploy do frontend (Vercel)
- [ ] Deploy das Edge Functions (Supabase)
- [ ] Configurar webhooks
- [ ] Testar fluxo completo

### Pós-deploy
- [ ] Configurar planos de preço
- [ ] Testar com clientes beta
- [ ] Monitorar métricas
- [ ] Ajustar limites conforme necessário

## 💡 Dicas para Replicação

### Setup Rápido
1. **Clone o repositório**
2. **Configure Supabase** com o mesmo schema
3. **Configure SMTP** (recomendado: Brevo)
4. **Deploy no Vercel** com as variáveis de ambiente
5. **Teste o fluxo completo**

### Customização
- **Cores**: Modificar tokens no CSS
- **Nome da marca**: Ajustar textos e logos
- **Planos**: Ajustar na tabela `planos_empresa`
- **Limites**: Configurar via variáveis de ambiente

---

**📅 Última atualização**: Agosto 2025  
**🏷️ Versão**: v1.0.0 - Sistema completo e pronto para produção  
**📧 Suporte**: suporte@dashboardmbk.com.br  

**🎉 SISTEMA 100% FUNCIONAL E PRONTO PARA ESCALAR!**