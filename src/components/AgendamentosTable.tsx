
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Agendamento } from "@/hooks/useAgendamentos";
import { CheckCircle } from "lucide-react";
import { ConfirmarAtendimentoModal } from "./ConfirmarAtendimentoModal";

interface AgendamentosTableProps {
  agendamentos: Agendamento[];
  onEdit: (agendamento: Agendamento) => void;
  onDelete: (id: number) => void;
  onConfirmarAtendimento: (agendamento: Agendamento) => void;
  getStatusBadge: (status: boolean | null, compareceu: boolean | null) => React.ReactNode;
}

export function AgendamentosTable({ agendamentos, onEdit, onDelete, onConfirmarAtendimento, getStatusBadge }: AgendamentosTableProps) {
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

  return (
    <Card className="border-border bg-card/50">
      <CardHeader>
        <CardTitle className="text-foreground">Lista de Agendamentos</CardTitle>
        <CardDescription>
          Todos os agendamentos da empresa
        </CardDescription>
      </CardHeader>
      <CardContent className="p-3 sm:p-6">
        <div className="overflow-x-auto">
          <Table className="min-w-[700px]">
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs sm:text-sm">Cliente</TableHead>
                <TableHead className="text-xs sm:text-sm hidden sm:table-cell">Contato</TableHead>
                <TableHead className="text-xs sm:text-sm">Data/Hora</TableHead>
                <TableHead className="text-xs sm:text-sm hidden md:table-cell">Serviço</TableHead>
                <TableHead className="text-xs sm:text-sm">Status</TableHead>
                <TableHead className="text-xs sm:text-sm">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agendamentos?.map((agendamento) => (
                <TableRow key={agendamento.id}>
                  <TableCell className="p-2 sm:p-4">
                    <div>
                      <div className="font-medium text-foreground text-sm sm:text-base">{agendamento.name || "N/A"}</div>
                      <div className="text-xs sm:text-sm text-muted-foreground">{agendamento.email || "N/A"}</div>
                      <div className="sm:hidden text-xs text-muted-foreground mt-1">
                        {agendamento.number || "N/A"}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="p-2 sm:p-4 hidden sm:table-cell">
                    <div className="text-xs sm:text-sm">
                      <div>{agendamento.number || "N/A"}</div>
                    </div>
                  </TableCell>
                  <TableCell className="p-2 sm:p-4">
                    <div className="text-xs sm:text-sm">
                      <div className="font-medium">{agendamento.data || "N/A"}</div>
                      <div className="text-muted-foreground">{agendamento.hora || "N/A"}</div>
                      <div className="md:hidden text-xs text-muted-foreground mt-1">
                        {agendamento.serviço || "N/A"}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="p-2 sm:p-4 hidden md:table-cell">
                    <div className="text-xs sm:text-sm">{agendamento.serviço || "N/A"}</div>
                  </TableCell>
                  <TableCell className="p-2 sm:p-4">
                    {getStatusBadge(agendamento.status, agendamento.compareceu)}
                  </TableCell>
                  <TableCell className="p-2 sm:p-4">
                    <div className="flex flex-col sm:flex-row gap-1 sm:gap-2">
                      {!agendamento.compareceu && agendamento.status && (
                        <Button
                          variant="default"
                          size="sm"
                          className="text-xs px-2 sm:px-3 bg-green-600 hover:bg-green-700"
                          onClick={() => handleConfirmAtendimento(agendamento)}
                        >
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Confirmar
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs px-2 sm:px-3"
                        onClick={() => onEdit(agendamento)}
                      >
                        Editar
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="text-xs px-2 sm:px-3"
                        onClick={() => onDelete(agendamento.id)}
                      >
                        Excluir
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!agendamentos?.length && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="text-muted-foreground text-sm">
                      Nenhum agendamento encontrado
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      
      <ConfirmarAtendimentoModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedAgendamento(null);
        }}
        onConfirm={handleConfirm}
        agendamento={selectedAgendamento}
      />
    </Card>
  );
}
