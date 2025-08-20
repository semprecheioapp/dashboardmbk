import React from 'react';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, Circle, CheckCircle, Clock, MessageCircle, Tag, Trash2 } from "lucide-react";
import { useWhatsAppLeads, WhatsAppLead } from "@/hooks/useWhatsAppLeads";
import { useLeadByPhone } from "@/hooks/useLeadByPhone";
import { ConversationFilter } from "./WhatsAppCRM";
import { useFavoritesStore } from "@/hooks/useFavoritesStore";
import { useDeleteContact } from "@/hooks/useDeleteContact";
import { ConfirmDeleteModal } from "@/components/ConfirmDeleteModal";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface ConversationListProps {
  selectedChat: string | null;
  onSelectChat: (chatId: string) => void;
  filters: ConversationFilter;
  collapsed: boolean;
}

interface ConversationItemProps {
  lead: WhatsAppLead;
  isSelected: boolean;
  onSelect: () => void;
  collapsed: boolean;
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'new':
      return <Circle className="h-3 w-3 text-blue-500 fill-blue-500" />;
    case 'in_progress':
      return <Clock className="h-3 w-3 text-yellow-500" />;
    case 'closed':
      return <CheckCircle className="h-3 w-3 text-green-500" />;
    default:
      return <Circle className="h-3 w-3 text-muted-foreground" />;
  }
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
  
  if (diffInMinutes < 1) return 'Agora';
  if (diffInMinutes < 60) return `${diffInMinutes}m`;
  if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
  
  const diffInDays = Math.floor(diffInMinutes / 1440);
  if (diffInDays === 1) return 'Ontem';
  if (diffInDays < 7) return `${diffInDays}d`;
  
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function ConversationItem({ lead, isSelected, onSelect, collapsed }: ConversationItemProps) {
  const { isFavorite } = useFavoritesStore();
  const { data: leadData } = useLeadByPhone(lead.telefone);
  const { deleteContact } = useDeleteContact();
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  
  // Buscar status real do lead
  const status = 'new'; // Por enquanto fixo, depois vem da tabela novos_leads
  const isLeadFavorite = isFavorite(lead.telefone);

  const handleDelete = () => {
    deleteContact({ phoneNumber: lead.telefone });
    setShowDeleteModal(false);
  };
  
  if (collapsed) {
    return (
      <Button
        variant={isSelected ? "secondary" : "ghost"}
        size="icon"
        onClick={onSelect}
        className={cn(
          "w-12 h-12 m-1 relative",
          isSelected && "bg-primary/10 border border-primary/20"
        )}
      >
        <Avatar className="h-8 w-8">
          <AvatarFallback className="text-xs">
            {lead.name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        {lead.unreadCount > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs flex items-center justify-center"
          >
            {lead.unreadCount > 9 ? '9+' : lead.unreadCount}
          </Badge>
        )}
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      onClick={onSelect}
      className={cn(
        "w-full h-auto p-3 justify-start hover:bg-muted/50 transition-colors",
        isSelected && "bg-primary/10 border-l-2 border-primary"
      )}
    >
      <div className="flex items-start gap-3 w-full">
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <Avatar className="h-10 w-10">
            <AvatarFallback>
              {lead.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {lead.isOnline && (
            <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 border-2 border-background rounded-full" />
          )}
        </div>

        {/* Conteúdo */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1">
              <h4 className="font-medium text-sm text-foreground truncate">
                {lead.name}
              </h4>
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 hover:bg-transparent"
                onClick={(e) => {
                  e.stopPropagation();
                  const { toggleFavorite } = useFavoritesStore.getState();
                  toggleFavorite(lead.telefone);
                }}
              >
                <Star 
                  className={cn(
                    "h-3 w-3 transition-colors",
                    isLeadFavorite && "text-yellow-500 fill-yellow-500"
                  )} 
                />
              </Button>
              {getStatusIcon(status)}
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">
                {formatTime(lead.lastMessageTime)}
              </span>
              {lead.unreadCount > 0 && (
                <Badge variant="destructive" className="h-5 px-1.5 text-xs">
                  {lead.unreadCount > 9 ? '9+' : lead.unreadCount}
                </Badge>
              )}
            </div>
          </div>
          
          <p className="text-xs text-muted-foreground truncate">
            {lead.lastMessage}
          </p>
          
          {/* Tags do lead */}
          {leadData?.tags && Array.isArray(leadData.tags) && leadData.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {(leadData.tags as string[]).slice(0, 2).map((tag: string, index: number) => (
                <Badge 
                  key={index} 
                  variant="secondary" 
                  className="text-xs px-1 py-0 h-4 flex items-center gap-1"
                >
                  <Tag className="w-2 h-2" />
                  {tag}
                </Badge>
              ))}
              {(leadData.tags as string[]).length > 2 && (
                <Badge variant="outline" className="text-xs px-1 py-0 h-4">
                  +{(leadData.tags as string[]).length - 2}
                </Badge>
              )}
            </div>
          )}
          
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs text-muted-foreground">
              {lead.telefone}
            </span>
            <div className="flex items-center gap-1">
              <MessageCircle className="h-3 w-3 text-muted-foreground" />
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteModal(true);
                }}
                className="h-6 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-3 w-3" />
                <span className="text-xs">Excluir</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      <ConfirmDeleteModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        contactName={lead.name}
        contactPhone={lead.telefone}
      />
    </Button>
  );
}

export function ConversationList({ selectedChat, onSelectChat, filters, collapsed }: ConversationListProps) {
  const { data: leads, isLoading } = useWhatsAppLeads();
  const { isFavorite } = useFavoritesStore();

  // Buscar dados dos leads para filtrar por tags
  const { data: allLeadsData } = useQuery({
    queryKey: ["all_leads_for_tags"],
    queryFn: async () => {
      const { data } = await supabase
        .from('novos_leads')
        .select('number, tags');
      return data || [];
    }
  });

  // Buscar conversas resolvidas
  const { data: resolvedConversations, refetch: refetchResolved } = useQuery({
    queryKey: ["resolved_conversations"],
    queryFn: async () => {
      const { data } = await supabase
        .from('conversas_resolvidas')
        .select('session_id');
      console.log('Conversas resolvidas carregadas:', data);
      return data || [];
    },
    refetchInterval: 1000, // Atualizar a cada 1 segundo
    staleTime: 0, // Sempre considerar stale para refetch imediato
    cacheTime: 5 * 60 * 1000 // Manter em cache por 5 minutos
  });

  // Forçar refetch quando houver mudanças nas conversas resolvidas
  React.useEffect(() => {
    const interval = setInterval(() => {
      refetchResolved();
    }, 2000); // Refetch a cada 2 segundos para garantir atualização

    return () => clearInterval(interval);
  }, [refetchResolved]);

  const filteredLeads = leads?.filter(lead => {
    // Buscar dados do lead para verificar tags
    const leadData = allLeadsData?.find(l => l.number === lead.telefone);
    
    // Filtro por busca
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchesBasic = 
        lead.name.toLowerCase().includes(searchLower) ||
        lead.telefone.includes(filters.search) ||
        lead.lastMessage.toLowerCase().includes(searchLower);
        
      const matchesTags = leadData?.tags && Array.isArray(leadData.tags) 
        ? (leadData.tags as string[]).some((tag: string) => 
            tag.toLowerCase().includes(searchLower)
          )
        : false;
      
      return matchesBasic || matchesTags;
    }

    // Filtro por tipo
    switch (filters.type) {
      case 'unread':
        return lead.unreadCount > 0;
      case 'contacts':
        return true; // Todos são contatos
      case 'favorites':
        return isFavorite(lead.telefone);
      case 'attended':
        return resolvedConversations?.some(r => r.session_id === lead.telefone);
      default:
        return true;
    }
  });

  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            {!collapsed && (
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  if (!filteredLeads?.length) {
    return (
      <div className="p-8 text-center">
        {!collapsed && (
          <>
            <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">
              {filters.search ? 'Nenhuma conversa encontrada' : 'Nenhuma conversa disponível'}
            </p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className={cn("p-2", collapsed && "px-1")}>
      {filteredLeads.map((lead) => (
        <ConversationItem
          key={lead.session_id}
          lead={lead}
          isSelected={selectedChat === lead.session_id}
          onSelect={() => onSelectChat(lead.session_id)}
          collapsed={collapsed}
        />
      ))}
    </div>
  );
}