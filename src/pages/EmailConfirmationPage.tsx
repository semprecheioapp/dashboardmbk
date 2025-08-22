import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function EmailConfirmationPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  
  useEffect(() => {
    const confirmEmail = async () => {
      const token_hash = searchParams.get('token_hash');
      const type = searchParams.get('type');

      if (!token_hash || (type !== 'signup' && type !== 'email')) {
        setStatus('error');
        return;
      }

      try {
        console.log('Confirming email with:', { token_hash, type });
        const { error } = await supabase.auth.verifyOtp({
          token_hash,
          type: type === 'email' ? 'email' : 'signup'
        });

        if (error) {
          console.error('Email confirmation error:', error);
          setStatus('error');
          toast.error('Erro ao confirmar email: ' + error.message);
          
          // Redirecionar após erro
          setTimeout(() => {
            navigate('/auth');
          }, 3000);
        } else {
          setStatus('success');
          toast.success('Email confirmado com sucesso!');
          
          // Redirecionar após sucesso
          setTimeout(() => {
            navigate('/');
          }, 2000);
        }
      } catch (error: any) {
        console.error('Unexpected error:', error);
        setStatus('error');
        toast.error('Erro inesperado ao confirmar email');
        
        setTimeout(() => {
          navigate('/auth');
        }, 3000);
      }
    };

    confirmEmail();
  }, [searchParams, navigate]);

  const renderContent = () => {
    switch (status) {
      case 'loading':
        return (
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <h2 className="text-lg font-semibold">Confirmando seu email...</h2>
            <p className="text-muted-foreground text-center">
              Aguarde enquanto confirmamos seu cadastro.
            </p>
          </div>
        );

      case 'success':
        return (
          <div className="flex flex-col items-center space-y-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <h2 className="text-lg font-semibold text-green-600">Email confirmado com sucesso!</h2>
            <p className="text-muted-foreground text-center">
              Seu cadastro foi confirmado. Você será redirecionado para o dashboard...
            </p>
          </div>
        );

      case 'error':
      default:
        return (
          <div className="flex flex-col items-center space-y-4">
            <XCircle className="h-8 w-8 text-destructive" />
            <h2 className="text-lg font-semibold text-destructive">Erro ao confirmar email</h2>
            <p className="text-muted-foreground text-center">
              Ocorreu um erro ao confirmar seu email. Por favor, tente novamente ou entre em contato com o suporte.
            </p>
            <button
              onClick={() => navigate('/auth')}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Voltar ao Login
            </button>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-dashboard-bg flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Confirmação de Email</CardTitle>
        </CardHeader>
        <CardContent>
          {renderContent()}
        </CardContent>
      </Card>
    </div>
  );
}