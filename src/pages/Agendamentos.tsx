
import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAgendamentos, useCreateAgendamento, useUpdateAgendamento, useDeleteAgendamento, useConfirmarAtendimentoComWebhook, Agendamento } from "@/hooks/useAgendamentos";
import { useCompany } from "@/hooks/useCompany";
import { AgendamentosFilters } from "@/components/AgendamentosFilters";
import { AgendamentosKanban } from "@/components/AgendamentosKanban";
import { AgendamentosTable } from "@/components/AgendamentosTable";
import { DateRange } from "@/components/DateRangePicker";
import { isWithinInterval, parseISO } from "date-fns";

export default function Agendamentos() {
  const { data: company } = useCompany();
  const { data: agendamentos, isLoading } = useAgendamentos(company?.id);
  const createAgendamento = useCreateAgendamento();
  const updateAgendamento = useUpdateAgendamento();
  const deleteAgendamento = useDeleteAgendamento();
  const confirmarAtendimento = useConfirmarAtendimentoComWebhook();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAgendamento, setEditingAgendamento] = useState<Agendamento | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [viewMode, setViewMode] = useState<"table" | "kanban">("kanban");
  const [formData, setFormData] = useState({
    name: "",
    number: "",
    email: "",
    data: "",
    hora: "",
    serviço: "",
    status: true,
    compareceu: false,
    lembrete_enviado: false,
    lembrete_enviado_2: false,
    empresa_id: company?.id || null,
  });

  // Filtrar agendamentos por período ou datas específicas
  const filteredAgendamentos = useMemo(() => {
    if (!agendamentos) return [];
    
    // Se não há filtros, retorna todos
    if ((!dateRange?.from || !dateRange?.to) && (!selectedDates || selectedDates.length === 0)) {
      return agendamentos;
    }

    return agendamentos.filter((agendamento) => {
      if (!agendamento.data) return false;
      
      try {
        // Handle different date formats from database
        let agendamentoDate;
        if (agendamento.data.includes('-') && agendamento.data.split('-').length === 3) {
          const parts = agendamento.data.split('-');
          if (parts[0].length === 2) {
            // dd-mm-yyyy format
            const [day, month, year] = parts;
            agendamentoDate = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00`);
          } else {
            // yyyy-mm-dd format
            agendamentoDate = parseISO(agendamento.data + 'T00:00:00');
          }
        } else if (agendamento.data.includes('/')) {
          // dd/mm/yyyy format
          const [day, month, year] = agendamento.data.split('/');
          agendamentoDate = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00`);
        } else {
          agendamentoDate = parseISO(agendamento.data + 'T00:00:00');
        }

        // Check if date is valid
        if (isNaN(agendamentoDate.getTime())) return false;

        // If specific dates are selected, check if appointment date matches any selected date
        if (selectedDates && selectedDates.length > 0) {
          return selectedDates.some(selectedDate => 
            agendamentoDate.toDateString() === selectedDate.toDateString()
          );
        }

        // If date range is set, check if appointment is within range
        if (dateRange?.from && dateRange?.to) {
          return isWithinInterval(agendamentoDate, {
            start: dateRange.from,
            end: dateRange.to
          });
        }

        return true;
      } catch {
        return false;
      }
    });
  }, [agendamentos, dateRange, selectedDates]);

  // Calcular estatísticas
  const stats = useMemo(() => {
    const total = filteredAgendamentos.length;
    const confirmed = filteredAgendamentos.filter(a => a.status && !a.compareceu).length;
    const completed = filteredAgendamentos.filter(a => a.compareceu).length;
    const cancelled = filteredAgendamentos.filter(a => !a.status).length;
    
    return { total, confirmed, completed, cancelled };
  }, [filteredAgendamentos]);

  const resetForm = () => {
    setFormData({
      name: "",
      number: "",
      email: "",
      data: "",
      hora: "",
      serviço: "",
      status: true,
      compareceu: false,
      lembrete_enviado: false,
      lembrete_enviado_2: false,
      empresa_id: company?.id || null,
    });
    setEditingAgendamento(null);
  };

  const handleOpenDialog = (agendamento?: Agendamento) => {
    if (agendamento) {
      setEditingAgendamento(agendamento);
      setFormData({
        name: agendamento.name || "",
        number: agendamento.number || "",
        email: agendamento.email || "",
        data: agendamento.data || "",
        hora: agendamento.hora || "",
        serviço: agendamento.serviço || "",
        status: agendamento.status || true,
        compareceu: agendamento.compareceu || false,
        lembrete_enviado: agendamento.lembrete_enviado || false,
        lembrete_enviado_2: agendamento.lembrete_enviado_2 || false,
        empresa_id: agendamento.empresa_id || company?.id || null,
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (editingAgendamento) {
      updateAgendamento.mutate(
        { id: editingAgendamento.id, ...formData },
        {
          onSuccess: () => {
            setIsDialogOpen(false);
            resetForm();
          },
        }
      );
    } else {
      createAgendamento.mutate(formData, {
        onSuccess: () => {
          setIsDialogOpen(false);
          resetForm();
        },
      });
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja excluir este agendamento?")) {
      deleteAgendamento.mutate(id);
    }
  };

  const handleConfirmarAtendimento = (agendamento: Agendamento) => {
    confirmarAtendimento.mutate(agendamento);
  };

  const getStatusBadge = (status: boolean | null, compareceu: boolean | null) => {
    if (compareceu) {
      return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Compareceu</Badge>;
    }
    if (status) {
      return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Agendado</Badge>;
    }
    return <Badge variant="destructive">Cancelado</Badge>;
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Agendamentos</h1>
              <p className="text-muted-foreground">Gerencie os agendamentos da empresa</p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Agendamentos</h1>
            <p className="text-muted-foreground">Gerencie os agendamentos da empresa</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()} className="bg-primary hover:bg-primary/90">
                <Calendar className="w-4 h-4 mr-2" />
                Novo Agendamento
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>
                  {editingAgendamento ? "Editar Agendamento" : "Novo Agendamento"}
                </DialogTitle>
                <DialogDescription>
                  {editingAgendamento ? "Edite as informações do agendamento" : "Preencha as informações para criar um novo agendamento"}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Nome do cliente"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="number">Telefone</Label>
                    <Input
                      id="number"
                      value={formData.number}
                      onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="cliente@email.com"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="data">Data</Label>
                    <Input
                      id="data"
                      type="date"
                      value={formData.data}
                      onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hora">Horário</Label>
                    <Input
                      id="hora"
                      type="time"
                      value={formData.hora}
                      onChange={(e) => setFormData({ ...formData, hora: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="servico">Serviço</Label>
                  <Input
                    id="servico"
                    value={formData.serviço}
                    onChange={(e) => setFormData({ ...formData, serviço: e.target.value })}
                    placeholder="Tipo de serviço"
                  />
                </div>
                <div className="flex items-center space-x-6">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="status"
                      checked={formData.status}
                      onCheckedChange={(checked) => setFormData({ ...formData, status: checked })}
                    />
                    <Label htmlFor="status">Ativo</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="compareceu"
                      checked={formData.compareceu}
                      onCheckedChange={(checked) => setFormData({ ...formData, compareceu: checked })}
                    />
                    <Label htmlFor="compareceu">Compareceu</Label>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false);
                    resetForm();
                  }}
                >
                  Cancelar
                </Button>
                <Button 
                  type="button" 
                  onClick={handleSubmit}
                  disabled={createAgendamento.isPending || updateAgendamento.isPending}
                >
                  {editingAgendamento ? "Salvar" : "Criar"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filtros e Estatísticas */}
        <AgendamentosFilters
          dateRange={dateRange}
          selectedDates={selectedDates}
          onDateRangeChange={setDateRange}
          onSelectedDatesChange={setSelectedDates}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          totalCount={stats.total}
          confirmedCount={stats.confirmed}
          completedCount={stats.completed}
          cancelledCount={stats.cancelled}
        />

        {/* Visualização */}
        {viewMode === "kanban" ? (
          <AgendamentosKanban
            agendamentos={filteredAgendamentos}
            onEdit={handleOpenDialog}
            onDelete={handleDelete}
            onConfirmarAtendimento={handleConfirmarAtendimento}
          />
        ) : (
          <AgendamentosTable
            agendamentos={filteredAgendamentos}
            onEdit={handleOpenDialog}
            onDelete={handleDelete}
            onConfirmarAtendimento={handleConfirmarAtendimento}
            getStatusBadge={getStatusBadge}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
