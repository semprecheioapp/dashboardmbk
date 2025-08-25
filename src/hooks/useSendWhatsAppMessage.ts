import { useMutation } from "@tanstack/react-query";

interface SendMessagePayload {
  empresa_id: number;
  nome: string;
  telefone: string;
  mensagem: string;
  remetente?: string;
}

export const useSendWhatsAppMessage = () => {
  return useMutation({
    mutationFn: async ({ nome, telefone, mensagem, remetente, empresa_id }: SendMessagePayload) => {
      console.log('🔍 Debug - Payload:', { nome, telefone, mensagem, remetente, empresa_id });

      const payload = {
        empresa_id,
        nome,
        telefone,
        mensagem,
        remetente: remetente || nome
      };

      console.log('🚀 Enviando:', JSON.stringify(payload, null, 2));

      const response = await fetch('https://wb.semprecheioapp.com.br/webhook/chat_whats_mbk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      console.log('📊 Resposta:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Erro webhook:', errorText);
        throw new Error(`Erro ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Sucesso:', data);
      return data;
    }
  });
};