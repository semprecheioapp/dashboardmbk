import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { UserPlus, CheckCircle2, AlertCircle, Key } from "lucide-react";
import { useCompanyRoles, AVAILABLE_PERMISSIONS } from "@/hooks/useCompanyRoles";
import { useAgentManagement, CreateInviteData } from "@/hooks/useAgentManagement";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface InviteAgentModalProps {
  children?: React.ReactNode;
  canInvite: boolean;
  usedSlots: number;
  totalSlots: number | null;
}

export const InviteAgentModal = ({ children, canInvite, usedSlots, totalSlots }: InviteAgentModalProps) => {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [customScopes, setCustomScopes] = useState<string[]>([]);
  const [useCustomScopes, setUseCustomScopes] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [useNewInviteFlow, setUseNewInviteFlow] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  const { data: roles = [] } = useCompanyRoles();
  const { createInvite, isCreatingInvite } = useAgentManagement();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) return;

    let scopes: string[] = [];
    
    if (useCustomScopes) {
      scopes = customScopes;
    } else if (selectedRole) {
      const role = roles.find(r => r.id === selectedRole);
      scopes = role?.permissions || [];
    }

    setIsCreating(true);

    try {
      if (useNewInviteFlow) {
        console.log('Creating agent with password:', { email, name, role_id, scopes, hasPassword: !!temporaryPassword });
        
        // Usar novo fluxo com senha pré-definida
        const { data, error } = await supabase.functions.invoke('agent-invite-create-with-password', {
          body: {
            email: email.trim(),
            name: name.trim() || undefined,
            role_id: useCustomScopes ? undefined : selectedRole || undefined,
            scopes,
            temporary_password: temporaryPassword || undefined
          }
        });

        console.log('Response from agent-invite-create-with-password:', { data, error });

        if (error) {
          console.error('Error creating agent:', error);
          throw new Error(error.message || 'Erro ao criar agente');
        }

        toast({
          title: "Agente adicionado com sucesso!",
          description: `O usuário ${email} foi criado e adicionado à empresa. As credenciais foram enviadas por email.`,
        });
      } else {
        // Usar fluxo antigo com convite
        const inviteData: CreateInviteData = {
          email: email.trim(),
          name: name.trim() || undefined,
          role_id: useCustomScopes ? undefined : selectedRole || undefined,
          scopes,
        };

        createInvite(inviteData, {
          onSuccess: () => {
            setOpen(false);
            setEmail("");
            setName("");
            setSelectedRole("");
            setCustomScopes([]);
            setUseCustomScopes(false);
            setTemporaryPassword("");
          }
        });
        return;
      }

      // Reset form and close
      setOpen(false);
      setEmail("");
      setName("");
      setSelectedRole("");
      setCustomScopes([]);
      setUseCustomScopes(false);
      setTemporaryPassword("");

    } catch (error: any) {
      toast({
        title: "Erro ao adicionar agente",
        description: error.message || "Ocorreu um erro inesperado",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const toggleScope = (scope: string) => {
    setCustomScopes(prev => 
      prev.includes(scope) 
        ? prev.filter(s => s !== scope)
        : [...prev, scope]
    );
  };

  const getSelectedPermissions = () => {
    if (useCustomScopes) return customScopes;
    if (selectedRole) {
      const role = roles.find(r => r.id === selectedRole);
      return role?.permissions || [];
    }
    return [];
  };

  const groupedPermissions = AVAILABLE_PERMISSIONS.reduce((acc, perm) => {
    if (!acc[perm.module]) acc[perm.module] = [];
    acc[perm.module].push(perm);
    return acc;
  }, {} as Record<string, typeof AVAILABLE_PERMISSIONS>);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button disabled={!canInvite} className="gap-2">
            <UserPlus className="h-4 w-4" />
            Convidar Agente
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Convidar Novo Agente
          </DialogTitle>
        </DialogHeader>

        {!canInvite && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Limite de agentes atingido ({usedSlots}/{totalSlots}). 
              Entre em contato com o suporte para aumentar o limite.
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail *</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="agente@empresa.com"
                required
                disabled={!canInvite}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Nome (opcional)</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome do agente"
                disabled={!canInvite}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="new-invite-flow"
                checked={useNewInviteFlow}
                onCheckedChange={(checked) => setUseNewInviteFlow(checked === true)}
                disabled={!canInvite}
              />
              <Label htmlFor="new-invite-flow" className="flex items-center gap-2">
                <Key className="h-4 w-4" />
                Criar usuário diretamente (sem convite)
              </Label>
            </div>

            {useNewInviteFlow && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                <div className="space-y-2">
                  <Label htmlFor="temporary-password">Senha temporária (opcional)</Label>
                  <Input
                    id="temporary-password"
                    type="password"
                    value={temporaryPassword}
                    onChange={(e) => setTemporaryPassword(e.target.value)}
                    placeholder="Deixe vazio para gerar automaticamente"
                    disabled={!canInvite}
                  />
                  <p className="text-xs text-muted-foreground">
                    O agente receberá esta senha por email e deverá trocá-la no primeiro acesso.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="custom-scopes"
                checked={useCustomScopes}
                onCheckedChange={(checked) => setUseCustomScopes(checked === true)}
                disabled={!canInvite}
              />
              <Label htmlFor="custom-scopes">Permissões personalizadas</Label>
            </div>

            {!useCustomScopes ? (
              <div className="space-y-2">
                <Label>Papel na Empresa</Label>
                <Select value={selectedRole} onValueChange={setSelectedRole} disabled={!canInvite}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um papel" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        <div>
                          <div className="font-medium">{role.name}</div>
                          <div className="text-sm text-muted-foreground">{role.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-4">
                <Label>Selecionar Permissões</Label>
                {Object.entries(groupedPermissions).map(([module, perms]) => (
                  <div key={module} className="space-y-2">
                    <h4 className="font-medium text-sm">{module}</h4>
                    <div className="grid grid-cols-2 gap-2 pl-4">
                      {perms.map((perm) => (
                        <div key={perm.key} className="flex items-center space-x-2">
                          <Checkbox
                            id={perm.key}
                            checked={customScopes.includes(perm.key)}
                            onCheckedChange={() => toggleScope(perm.key)}
                            disabled={!canInvite}
                          />
                          <Label htmlFor={perm.key} className="text-sm">{perm.label}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {getSelectedPermissions().length > 0 && (
            <div className="space-y-2">
              <Label>Permissões Selecionadas</Label>
              <div className="flex flex-wrap gap-1">
                {getSelectedPermissions().map((scope) => {
                  const perm = AVAILABLE_PERMISSIONS.find(p => p.key === scope);
                  return (
                    <Badge key={scope} variant="secondary" className="text-xs">
                      {perm?.label || scope}
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={!canInvite || !email.trim() || getSelectedPermissions().length === 0 || isCreating || isCreatingInvite}
              className="gap-2"
            >
              {isCreating || isCreatingInvite ? (
                <>Processando...</>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  {useNewInviteFlow ? 'Adicionar Agente' : 'Enviar Convite'}
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};