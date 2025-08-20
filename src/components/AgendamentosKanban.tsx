
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, User, Phone, Mail, MoreVertical, CheckCircle } from "lucide-react";
import { Agendamento } from "@/hooks/useAgendamentos";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmarAtendimentoModal } from "./ConfirmarAtendimentoModal";

interface AgendamentosKanbanProps {
  agendamentos: Agendamento[];
  onEdit: (agendamento: Agendamento) => void;
  onDelete: (id: number) => void;
  onConfirmarAtendimento: (agendamento: Agendamento) => void;
}

export function AgendamentosKanban({ agendamentos, onEdit, onDelete, onConfirmarAtendimento }: AgendamentosKanbanProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedAgendamento, setSelectedAgendamento] = useState<Agendamento | null>(null);

  const handleConfirmAtendimento = (agendamento: Agendamento) => {
    setSelectedAgendamento(agendamento);
    setModalOpen(true);
  };

  const handleConfirm = () => {
    if (selectedAgendamento) {
      onConfirmarAtendimento(selectedAgendamento);
      setModalOpen(false);
      setSelectedAgendamento(null);
    }
  };

  const columns = [
    {
      id: "agendado",
      title: "Agendados",
      color: "blue",
      filter: (a: Agendamento) => a.status && !a.compareceu
    },
    {
      id: "hoje",
      title: "Hoje",
      color: "orange",
      filter: (a: Agendamento) => {
        const hoje = format(new Date(), "yyyy-MM-dd");
        return a.data === hoje && a.status && !a.compareceu;
      }
    },
    {
      id: "realizados",
      title: "Realizados",
      color: "green",
      filter: (a: Agendamento) => a.compareceu
    },
    {
      id: "cancelados",
      title: "Cancelados",
      color: "red",
      filter: (a: Agendamento) => !a.status
    }
  ];

  const getStatusBadge = (status: boolean | null, compareceu: boolean | null) => {
    if (compareceu) {
      return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Compareceu</Badge>;
    }
    if (status) {
      return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Agendado</Badge>;
    }
    return <Badge variant="destructive">Cancelado</Badge>;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {columns.map((column) => {
        const columnAgendamentos = agendamentos?.filter(column.filter) || [];
        
        return (
          <div key={column.id} className="space-y-4">
            <Card className="border-border">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <div 
                      className={`w-3 h-3 rounded-full ${
                        column.color === 'blue' ? 'bg-blue-500' :
                        column.color === 'orange' ? 'bg-orange-500' :
                        column.color === 'green' ? 'bg-green-500' :
                        'bg-red-500'
                      }`}
                    />
                    {column.title}
                  </CardTitle>
                  <Badge variant="secondary">{columnAgendamentos.length}</Badge>
                </div>
              </CardHeader>
            </Card>

            <div className="space-y-3 min-h-[400px]">
              {columnAgendamentos.map((agendamento) => (
                <Card key={agendamento.id} className="border-border bg-card/50 hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:border-primary/50 transition-all duration-300 group relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      {/* Header com nome e ações */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2 flex-1">
                          <User className="w-4 h-4 text-primary flex-shrink-0" />
                          <h4 className="font-medium text-foreground text-sm truncate">
                            {agendamento.name || "Cliente"}
                          </h4>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                              <MoreVertical className="w-3 h-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {!agendamento.compareceu && agendamento.status && (
                              <DropdownMenuItem 
                                onClick={() => handleConfirmAtendimento(agendamento)}
                              >
                                <CheckCircle className="w-3 h-3 mr-2" />
                                Confirmar Atendimento
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => onEdit(agendamento)}>
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => onDelete(agendamento.id)}
                              className="text-destructive"
                            >
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* Informações de contato */}
                      {agendamento.number && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                          <span className="text-xs text-muted-foreground truncate">
                            {agendamento.number}
                          </span>
                        </div>
                      )}

                      {agendamento.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                          <span className="text-xs text-muted-foreground truncate">
                            {agendamento.email}
                          </span>
                        </div>
                      )}

                      {/* Data e hora */}
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                        <span className="text-xs text-muted-foreground">
                          {(() => {
                            if (!agendamento.data) return "N/A";
                            
                            try {
                              let dateToFormat;
                              
                              // Handle dd-mm-yyyy format (banco de dados format)
                              if (agendamento.data.includes('-') && agendamento.data.split('-').length === 3) {
                                const parts = agendamento.data.split('-');
                                if (parts[0].length === 2) {
                                  // dd-mm-yyyy format
                                  const [day, month, year] = parts;
                                  dateToFormat = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00`);
                                } else {
                                  // yyyy-mm-dd format
                                  dateToFormat = new Date(agendamento.data + 'T00:00:00');
                                }
                              } else if (agendamento.data.includes('/')) {
                                // dd/mm/yyyy format
                                const [day, month, year] = agendamento.data.split('/');
                                dateToFormat = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00`);
                              } else {
                                dateToFormat = new Date(agendamento.data);
                              }
                              
                              return isNaN(dateToFormat.getTime()) ? 
                                agendamento.data : 
                                format(dateToFormat, "dd/MM/yyyy", { locale: ptBR });
                            } catch (error) {
                              return agendamento.data;
                            }
                          })()}
                        </span>
                        {agendamento.hora && (
                          <>
                            <Clock className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                            <span className="text-xs text-muted-foreground">
                              {agendamento.hora}
                            </span>
                          </>
                        )}
                      </div>

                      {/* Serviço */}
                      {agendamento.serviço && (
                        <div className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded">
                          {agendamento.serviço}
                        </div>
                      )}

                      {/* Status */}
                      <div className="flex justify-center">
                        {getStatusBadge(agendamento.status, agendamento.compareceu)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {columnAgendamentos.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Nenhum agendamento
                </div>
              )}
            </div>
          </div>
        );
      })}

      <ConfirmarAtendimentoModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedAgendamento(null);
        }}
        onConfirm={handleConfirm}
        agendamento={selectedAgendamento}
      />
    </div>
  );
}
