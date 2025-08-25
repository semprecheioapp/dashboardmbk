import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SendMessagePayload {
  empresa_id: number;
  nome: string;
  telefone: string;
  mensagem: string;
  remetente?: string;
}

export const useSendWhatsAppMessage = () => {
  const { empresaData } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ nome, telefone, mensagem, remetente }: Omit<SendMessagePayload, 'empresa_id'>) => {
      if (!empresaData?.id) {
        throw new Error("Empresa ID não encontrado");
      }

      const payload: SendMessagePayload = {
        empresa_id: empresaData.id,
        nome,
        telefone,
        mensagem,
        remetente: remetente || nome
      };

      // Enviar para o webhook
      const response = await fetch('https://wb.semprecheioapp.com.br/webhook/chat_whats_mbk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Erro ao enviar mensagem: ${response.status}`);
      }

      // Tentar salvar a mensagem no banco (opcional)
      try {
        const { error: dbError } = await supabase
          .from('memoria_ai')
          .insert({
            session_id: telefone,
            empresa_id: empresaData.id,
            message: {
              type: "ai",
              content: mensagem,
              isFromAI: true,
              tool_calls: [],
              additional_kwargs: {},
              response_metadata: {
                sender_name: remetente || nome,
                is_manual: true
              },
              invalid_tool_calls: []
            }
          });

        if (dbError) {
          console.warn('⚠️ Erro ao salvar no banco (não crítico):', dbError.message);
        }
      } catch (dbError) {
        console.warn('⚠️ Erro de banco ignorado:', dbError.message);
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      // Invalidar cache para atualizar a conversa
      queryClient.invalidateQueries({ 
        queryKey: ["lead_conversations", variables.telefone, empresaData.id]
      });
      queryClient.invalidateQueries({ 
        queryKey: ["whatsapp_leads", empresaData.id]
      });
      
      toast.success("Mensagem enviada com sucesso!");
    },
    onError: (error) => {
      console.error('Erro ao enviar mensagem:', error);
      toast.error("Erro ao enviar mensagem. Tente novamente.");
    }
  });
};