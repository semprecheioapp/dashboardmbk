import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ResolveConversationData {
  chatId: string;
  empresa_id: number;
  nome: string;
  numero: string;
}

export function useResolveConversation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: ResolveConversationData) => {
      // 1. Adicionar à tabela de conversas resolvidas para mover para aba "Atendidos"
      try {
        console.log('Inserindo conversa resolvida:', {
          session_id: data.numero,
          empresa_id: data.empresa_id,
          chatId: data.chatId
        });
        
        const { error: insertError } = await supabase
          .from('conversas_resolvidas')
          .insert({
            session_id: data.numero,
            empresa_id: data.empresa_id,
            resolvido_em: new Date().toISOString()
          });

        if (insertError && insertError.code !== '23505') { // Ignorar duplicados
          console.error('Erro ao inserir conversa resolvida:', insertError);
        } else if (!insertError) {
          console.log('Conversa resolvida inserida com sucesso:', data.numero);
        }
      } catch (error) {
        console.error('Erro ao processar conversa resolvida:', error);
      }

      // 2. Enviar webhook para pesquisa de satisfação
      const webhookData = {
        empresa_id: data.empresa_id,
        nome: data.nome,
        numero: data.numero,
        chat_id: data.chatId,
      };

      const response = await fetch('https://wb.semprecheioapp.com.br/webhook/pesquisa_satisfacao_dashmbk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookData),
      });

      if (!response.ok) {
        throw new Error(`Webhook failed: ${response.status}`);
      }

      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Conversa resolvida!",
        description: "Conversa movida para aba 'Atendidos' e pesquisa de satisfação enviada.",
      });
      
      // Invalidar cache para atualizar lista de conversas
      queryClient.invalidateQueries({ queryKey: ["resolved_conversations"] });
      queryClient.invalidateQueries({ queryKey: ["whatsapp_leads"] });
      queryClient.invalidateQueries({ queryKey: ["all_leads_for_tags"] });
    },
    onError: (error) => {
      toast({
        title: "Erro ao resolver conversa",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    },
  });
}