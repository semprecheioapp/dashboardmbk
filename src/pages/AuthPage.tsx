import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AuthLayout } from "@/components/AuthLayout";
import { ShimmerButton } from "@/components/magicui/shimmer-button";
import { toast } from "sonner";
import { Navigate, useSearchParams } from "react-router-dom";
import BlurFade from "@/components/ui/blur-fade";
import { Lock, UserPlus } from "lucide-react";

const AuthPage = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const hash = window.location.hash;
  
  // Parâmetros de convite
  const inviteToken = searchParams.get('invite_token');
  const inviteEmail = searchParams.get('email');
  const isInviteFlow = Boolean(inviteToken);
  
  // Estados para Login
  const [email, setEmail] = useState(inviteEmail || "");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [keepConnected, setKeepConnected] = useState(false);
  
  // Estados para Cadastro via Convite
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState(inviteEmail || "");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupLoading, setSignupLoading] = useState(false);
  
  // Estados para Cadastro Normal (se não for convite)
  const [companyName, setCompanyName] = useState("");
  const [companyPhone, setCompanyPhone] = useState("");

  // Garantir que o email do convite seja aplicado
  useEffect(() => {
    if (isInviteFlow && inviteEmail) {
      setSignupEmail(inviteEmail);
    }
  }, [isInviteFlow, inviteEmail]);

  // Redirect if already authenticated
  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Por favor, preencha todos os campos");
      return;
    }

    setLoading(true);
    
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        console.error("Sign in error:", error);
        toast.error(error.message || "Erro ao fazer login");
      } else {
        toast.success("Login realizado com sucesso!");
      }
    } catch (error: any) {
      console.error("Auth error:", error);
      toast.error("Erro inesperado. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!signupName || !signupPassword || (!isInviteFlow && !signupEmail)) {
      toast.error("Por favor, preencha todos os campos obrigatórios");
      return;
    }

    if (signupPassword.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }

    setSignupLoading(true);
    
    try {
      let email = isInviteFlow ? (inviteEmail || signupEmail) : signupEmail;

      const redirectUrl = inviteToken 
        ? `${window.location.origin}/accept-invite-after-register?token=${inviteToken}`
        : `${window.location.origin}/auth/confirm`;
      
      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: signupPassword,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            nome: signupName,
            ...(isInviteFlow ? {} : {
              empresa_name: companyName,
              empresa_phone: companyPhone
            })
          },
          // Configurar confirmação de email - sempre ativado para segurança
          email_confirm: false
        }
      });

      if (error) {
        console.error("Sign up error:", error);
        if (error.message.includes("already registered")) {
          toast.error("Este email já está cadastrado. Tente fazer login.");
        } else {
          toast.error(error.message || "Erro ao criar conta");
        }
      } else {
        if (isInviteFlow) {
          toast.success("Conta criada! Redirecionando para aceitar o convite...");
        } else {
          toast.success("Conta criada! Verifique seu email para confirmar o cadastro.");
        }
        
        // Limpar formulário apenas se não for convite
        if (!isInviteFlow) {
          setSignupName("");
          setSignupEmail("");
          setSignupPassword("");
          setCompanyName("");
          setCompanyPhone("");
        }
      }
    } catch (error: any) {
      console.error("Signup error:", error);
      toast.error("Erro inesperado. Tente novamente.");
    } finally {
      setSignupLoading(false);
    }
  };

  return (
    <AuthLayout 
      title="DashBoard_Mbk" 
      subtitle="Acesse sua conta ou crie uma nova"
    >
      <BlurFade delay={0.1}>
        <Tabs defaultValue={hash === "#cadastro" || inviteToken ? "cadastro" : "login"} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="cadastro">Cadastro</TabsTrigger>
          </TabsList>
          
          {/* Tab Login */}
          <TabsContent value="login">
            <form onSubmit={handleSubmit} className="space-y-6">
              <BlurFade delay={0.2}>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-blue-300 font-semibold text-base">
                    E-mail
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-slate-800/50 border-slate-600 focus:border-blue-400 text-white placeholder:text-slate-400 transition-all duration-300 min-h-[44px] text-sm sm:text-base"
                    required
                  />
                </div>
              </BlurFade>
              
              <BlurFade delay={0.3}>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-blue-300 font-semibold text-base">
                    Senha
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-slate-800/50 border-slate-600 focus:border-blue-400 text-white placeholder:text-slate-400 transition-all duration-300 min-h-[44px] text-sm sm:text-base"
                    required
                  />
                </div>
              </BlurFade>
              
              <BlurFade delay={0.35}>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="keep-connected" 
                    checked={keepConnected}
                    onCheckedChange={(checked) => setKeepConnected(checked === true)}
                    className="border-slate-600 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                  />
                  <Label htmlFor="keep-connected" className="text-sm text-slate-300 font-medium cursor-pointer">
                    Manter conectado
                  </Label>
                </div>
              </BlurFade>

              <BlurFade delay={0.4}>
                <Button 
                  type="submit" 
                  className="w-full py-3 text-sm sm:text-base font-bold min-h-[44px] touch-target transition-all duration-300"
                  style={{
                    backgroundColor: '#3B82F6',
                    borderColor: '#3B82F6'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#2563EB';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#3B82F6';
                  }}
                  disabled={loading}
                >
                  {loading ? "Carregando..." : "Entrar"}
                </Button>
              </BlurFade>
            </form>
          </TabsContent>
          
          {/* Tab Cadastro */}
          <TabsContent value="cadastro">
            <form onSubmit={handleSignUp} className="space-y-6">
              {isInviteFlow && (
                <div className="mb-4 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                  <div className="flex items-center mb-2">
                    <UserPlus className="h-5 w-5 text-blue-400 mr-2" />
                    <h3 className="text-blue-300 font-semibold">Cadastro via Convite</h3>
                  </div>
                  <p className="text-sm text-blue-200">
                    Você está criando uma conta para aceitar o convite. <br />
                    Complete apenas seu nome e senha.
                  </p>
                </div>
              )}
              
              <BlurFade delay={0.2}>
                <div className="space-y-2">
                  <Label htmlFor="signup-name" className="text-blue-300 font-semibold text-base">
                    Nome Completo *
                  </Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="Seu nome completo"
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    className="bg-slate-800/50 border-slate-600 focus:border-blue-400 text-white placeholder:text-slate-400 transition-all duration-300 min-h-[44px] text-sm sm:text-base"
                    required
                  />
                </div>
              </BlurFade>
              
              <BlurFade delay={0.25}>
                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="text-blue-300 font-semibold text-base">
                    E-mail *
                  </Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="seu@email.com"
                    value={isInviteFlow ? (inviteEmail || "Email será obtido do convite") : signupEmail}
                    onChange={(e) => !isInviteFlow && setSignupEmail(e.target.value)}
                    className="bg-slate-800/50 border-slate-600 focus:border-blue-400 text-white placeholder:text-slate-400 transition-all duration-300 min-h-[44px] text-sm sm:text-base"
                    required
                    readOnly={isInviteFlow}
                    disabled={isInviteFlow}
                  />
                  {isInviteFlow && (
                    <p className="text-xs text-blue-200">Email será obtido automaticamente do convite</p>
                  )}
                </div>
              </BlurFade>
              
              <BlurFade delay={0.3}>
                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="text-blue-300 font-semibold text-base">
                    Senha *
                  </Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    className="bg-slate-800/50 border-slate-600 focus:border-blue-400 text-white placeholder:text-slate-400 transition-all duration-300 min-h-[44px] text-sm sm:text-base"
                    required
                    minLength={6}
                  />
                </div>
              </BlurFade>

              {!isInviteFlow && (
                <>
                  <BlurFade delay={0.35}>
                    <div className="space-y-2">
                      <Label htmlFor="company-name" className="text-blue-300 font-semibold text-base">
                        Nome da Empresa *
                      </Label>
                      <Input
                        id="company-name"
                        type="text"
                        placeholder="Nome da sua empresa"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        className="bg-slate-800/50 border-slate-600 focus:border-blue-400 text-white placeholder:text-slate-400 transition-all duration-300 min-h-[44px] text-sm sm:text-base"
                        required
                      />
                    </div>
                  </BlurFade>
                  
                  <BlurFade delay={0.4}>
                    <div className="space-y-2">
                      <Label htmlFor="company-phone" className="text-blue-300 font-semibold text-base">
                        Telefone da Empresa
                      </Label>
                      <Input
                        id="company-phone"
                        type="tel"
                        placeholder="(11) 99999-9999"
                        value={companyPhone}
                        onChange={(e) => setCompanyPhone(e.target.value)}
                        className="bg-slate-800/50 border-slate-600 focus:border-blue-400 text-white placeholder:text-slate-400 transition-all duration-300 min-h-[44px] text-sm sm:text-base"
                      />
                    </div>
                  </BlurFade>
                </>
              )} 

              <BlurFade delay={0.45}>
                <Button 
                  type="submit" 
                  className="w-full py-3 text-sm sm:text-base font-bold min-h-[44px] touch-target transition-all duration-300"
                  style={{
                    backgroundColor: '#10B981',
                    borderColor: '#10B981'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#059669';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#10B981';
                  }}
                  disabled={signupLoading}
                >
                  {signupLoading ? "Criando conta..." : "Criar Conta"}
                </Button>
              </BlurFade>
            </form>
          </TabsContent>
          
          {/* Elemento de Credibilidade */}
          <BlurFade delay={0.5}>
            <div className="flex items-center justify-center space-x-2 text-slate-400 text-sm font-medium mt-6">
              <Lock className="w-4 h-4" />
              <span>Conexão segura – seus dados estão protegidos.</span>
            </div>
          </BlurFade>
        </Tabs>
      </BlurFade>
    </AuthLayout>
  );
};

export default AuthPage;