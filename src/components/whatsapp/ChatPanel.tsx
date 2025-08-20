import { useState, useRef, useEffect } from "react";
import { Send, Info, MoreVertical, Phone, Video, Paperclip, ArrowLeft, Edit3, Check, X, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useWhatsAppLeads } from "@/hooks/useWhatsAppLeads";
import { useLeadConversations } from "@/hooks/useLeadConversations";
import { useSendWhatsAppMessage } from "@/hooks/useSendWhatsAppMessage";
import { useConfiguracoesEmpresa } from "@/hooks/useConfiguracoesEmpresa";
import { useResolveConversation } from "@/hooks/useResolveConversation";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { Smartphone } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ChatPanelProps {
  chatId: string | null;
  onToggleInfoPanel: () => void;
  infoPanelCollapsed: boolean;
  onBackToConversations?: () => void;
  isMobile?: boolean;
}

interface MessageBubbleProps {
  content: string;
  timestamp: string;
  isFromAI: boolean;
  isLast?: boolean;
  senderName?: string;
  isManual?: boolean;
}

function MessageBubble({ content, timestamp, isFromAI, isLast, senderName, isManual }: MessageBubbleProps) {
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className={cn(
      "flex mb-4 animate-fade-in px-2 sm:px-4",
      isFromAI ? "justify-end" : "justify-start"
    )}>
      <div className={cn(
        "flex flex-col w-full",
        isFromAI ? "items-end" : "items-start"
      )}>
        {/* Mostrar nome do remetente para mensagens manuais da empresa */}
        {isFromAI && isManual && senderName && (
          <div className="text-xs text-muted-foreground mb-1 px-2">
            {senderName}
          </div>
        )}
        
        <div className={cn(
          "relative rounded-2xl px-3 py-2 shadow-sm break-words",
          "min-w-[80px] max-w-[85%] sm:max-w-[75%] md:max-w-[65%] lg:max-w-[55%]",
          isFromAI 
            ? "bg-primary text-primary-foreground rounded-br-md" 
            : "bg-muted text-foreground rounded-bl-md"
        )}>
          <p className="text-sm leading-relaxed whitespace-pre-wrap word-break">{content}</p>
          <div className={cn(
            "flex items-center justify-end mt-1 gap-1",
            isFromAI ? "text-primary-foreground/70" : "text-muted-foreground"
          )}>
            <span className="text-xs leading-none">{formatTime(timestamp)}</span>
            {isFromAI && (
              <div className="flex gap-0.5 ml-1">
                <div className="w-1 h-1 bg-current rounded-full opacity-70" />
                <div className="w-1 h-1 bg-current rounded-full opacity-70" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ChatPanel({ chatId, onToggleInfoPanel, infoPanelCollapsed, onBackToConversations, isMobile }: ChatPanelProps) {
  const [message, setMessage] = useState("");
  const [senderName, setSenderName] = useState("");
  const [isEditingSender, setIsEditingSender] = useState(false);
  const [savedSenderName, setSavedSenderName] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: leads } = useWhatsAppLeads();
  const { data: conversations, isLoading: conversationsLoading } = useLeadConversations(chatId || "");
  const { mutate: sendMessage, isPending: isSending } = useSendWhatsAppMessage();
  const { data: config } = useConfiguracoesEmpresa();
  const { mutate: resolveConversation, isPending: isResolving } = useResolveConversation();
  const { empresaData } = useAuth();

  const currentLead = leads?.find(lead => lead.session_id === chatId);

  // Carregar nome do remetente salvo
  useEffect(() => {
    const saved = localStorage.getItem('whatsapp-sender-name');
    if (saved) {
      setSavedSenderName(saved);
    }
  }, []);

  // Salvar nome do remetente
  const handleSaveSenderName = () => {
    if (senderName.trim()) {
      localStorage.setItem('whatsapp-sender-name', senderName.trim());
      setSavedSenderName(senderName.trim());
      setIsEditingSender(false);
      setSenderName("");
    }
  };

  // Editar nome do remetente
  const handleEditSenderName = () => {
    setSenderName(savedSenderName);
    setIsEditingSender(true);
  };

  // Cancelar edição
  const handleCancelEdit = () => {
    setSenderName("");
    setIsEditingSender(false);
  };

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [conversations]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [message]);

  const handleSendMessage = () => {
    if (!message.trim() || !currentLead || isSending) return;

    const remetente = savedSenderName || config?.nome_remetente_padrao || "Atendente";

    sendMessage({
      nome: currentLead.name,
      telefone: currentLead.telefone,
      mensagem: message.trim(),
      remetente
    });

    setMessage("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (isEditingSender) {
        handleSaveSenderName();
      } else {
        handleSendMessage();
      }
    }
  };

  if (!chatId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-background">
        <div className="p-6 rounded-full bg-muted/30 mb-6">
          <Smartphone className="w-16 h-16 text-muted-foreground" />
        </div>
        <h3 className="text-2xl font-light text-foreground mb-3">
          CHAT AO VIVO MBK
        </h3>
        <p className="text-muted-foreground text-center max-w-sm">
          Selecione uma conversa da lista para começar a responder mensagens dos seus leads.
        </p>
      </div>
    );
  }

  if (!currentLead) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">Lead não encontrado</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header do Chat */}
      <div className="p-4 border-b border-border bg-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isMobile && onBackToConversations && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onBackToConversations}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <Avatar className="h-10 w-10">
              <AvatarFallback>
                {currentLead.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground truncate">{currentLead.name}</h3>
              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground truncate">{currentLead.telefone}</p>
                {currentLead.isOnline && (
                  <Badge variant="secondary" className="text-xs px-2 py-0">
                    Online
                  </Badge>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            {!isMobile && (
              <>
                {/* Ícones de ligação removidos conforme solicitado */}
              </>
            )}
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={onToggleInfoPanel}
            >
              <Info className={cn(
                "h-4 w-4 transition-colors",
                !infoPanelCollapsed && "text-primary"
              )} />
            </Button>
            {!isMobile && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem 
                    onClick={async () => {
                      if (currentLead && empresaData) {
                        await resolveConversation({
                          chatId,
                          empresa_id: empresaData.id,
                          nome: currentLead.name,
                          numero: currentLead.telefone,
                        });
                      }
                    }}
                    disabled={isResolving}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Marcar como resolvido
                  </DropdownMenuItem>
                  <DropdownMenuItem>Agendar follow-up</DropdownMenuItem>
                  <DropdownMenuItem>Bloquear contato</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>

      {/* Área de Mensagens */}
      <ScrollArea className="flex-1 px-4">
        <div className="py-4">
          {conversationsLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className={cn("flex", i % 2 === 0 ? "justify-start" : "justify-end")}>
                  <div className="max-w-[70%] space-y-2">
                    <Skeleton className="h-16 w-48" />
                    <Skeleton className="h-3 w-12 ml-auto" />
                  </div>
                </div>
              ))}
            </div>
          ) : conversations?.length ? (
            <>
              {conversations.map((conv, index) => (
                <MessageBubble
                  key={conv.id}
                  content={conv.content}
                  timestamp={conv.timestamp}
                  isFromAI={conv.isFromAI}
                  isLast={index === conversations.length - 1}
                  senderName={conv.rawMessage?.response_metadata?.sender_name}
                  isManual={conv.rawMessage?.response_metadata?.is_manual}
                />
              ))}
              {isSending && (
                <div className="flex justify-end mb-4">
                  <div className="bg-primary/50 text-primary-foreground rounded-lg px-4 py-2">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-current rounded-full animate-pulse" />
                      <div className="w-2 h-2 bg-current rounded-full animate-pulse" style={{ animationDelay: '0.1s' }} />
                      <div className="w-2 h-2 bg-current rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Nenhuma mensagem ainda</p>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Composer */}
      <div className="p-4 border-t border-border bg-card">
        <div className="space-y-3">
          {/* Sender name display/edit */}
          <div className="flex items-center gap-2">
            <Label className="text-sm text-muted-foreground whitespace-nowrap">
              Remetente:
            </Label>
            
            {!savedSenderName && !isEditingSender ? (
              // Estado inicial - sem nome salvo
              <div className="flex items-center gap-2 flex-1">
                <Input
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={config?.nome_remetente_padrao || "Digite seu nome"}
                  className="h-8 text-sm bg-background flex-1"
                />
                <Button
                  onClick={handleSaveSenderName}
                  disabled={!senderName.trim()}
                  size="sm"
                  className="h-8 px-3"
                >
                  <Check className="h-3 w-3" />
                </Button>
              </div>
            ) : isEditingSender ? (
              // Estado de edição
              <div className="flex items-center gap-2 flex-1">
                <Input
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="h-8 text-sm bg-background flex-1"
                  autoFocus
                />
                <Button
                  onClick={handleSaveSenderName}
                  disabled={!senderName.trim()}
                  size="sm"
                  className="h-8 px-3"
                >
                  <Check className="h-3 w-3" />
                </Button>
                <Button
                  onClick={handleCancelEdit}
                  size="sm"
                  variant="ghost"
                  className="h-8 px-3"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              // Estado com nome salvo
              <div className="flex items-center gap-2 flex-1">
                <span className="text-sm font-medium text-foreground flex-1">
                  {savedSenderName}
                </span>
                <Button
                  onClick={handleEditSenderName}
                  size="sm"
                  variant="ghost"
                  className="h-8 px-3"
                >
                  <Edit3 className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
          
          {/* Message input */}
          <div className="flex items-end gap-2">
            {!isMobile && (
              <Button variant="ghost" size="icon" className="h-9 w-9 flex-shrink-0">
                <Paperclip className="h-4 w-4" />
              </Button>
            )}
            <div className="flex-1 relative">
              <Textarea
                ref={textareaRef}
                placeholder="Digite sua mensagem..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isSending}
                className="min-h-[40px] max-h-[120px] resize-none pr-12 bg-background"
                rows={1}
              />
            </div>
            <Button 
              onClick={handleSendMessage}
              disabled={!message.trim() || isSending}
              size="icon"
              className="h-9 w-9 flex-shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}