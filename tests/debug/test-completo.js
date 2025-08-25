// Teste completo para debug do erro de envio
async function debugEnvioCompleto() {
  console.log('🧪 INICIANDO TESTE COMPLETO DE DEBUG');
  
  // Testar 1: Webhook direto
  console.log('1️⃣ Testando webhook direto...');
  const payloadTeste = {
    empresa_id: 2,
    nome: "Manoel Automações",
    telefone: "556699618890",
    mensagem: "Teste debug completo",
    remetente: "Sistema Debug"
  };

  try {
    const response = await fetch('https://wb.semprecheioapp.com.br/webhook/chat_whats_mbk', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payloadTeste)
    });

    console.log('✅ Webhook response:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    });

    const data = await response.json();
    console.log('✅ Webhook data:', data);

  } catch (error) {
    console.error('❌ Erro webhook:', error);
  }

  // Testar 2: Supabase conexão
  console.log('2️⃣ Testando conexão Supabase...');
  try {
    const { data: testData, error: testError } = await supabase
      .from('memoria_ai')
      .select('*')
      .limit(1);

    console.log('✅ Supabase conexão:', { 
      data: testData ? 'OK' : 'VAZIA', 
      error: testError ? testError.message : 'NENHUM' 
    });
  } catch (error) {
    console.error('❌ Erro Supabase:', error);
  }

  // Testar 3: Contexto de autenticação
  console.log('3️⃣ Testando contexto de autenticação...');
  console.log('✅ Auth:', {
    empresaData: window.__EMPRESA_DATA__,
    user: window.__USER_DATA__
  });
}

// Adicionar ao window para teste
window.debugEnvioCompleto = debugEnvioCompleto;
console.log('Execute no console: debugEnvioCompleto()');