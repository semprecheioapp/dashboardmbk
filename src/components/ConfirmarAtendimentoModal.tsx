import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, User, Calendar, Clock, Phone } from "lucide-react";
import { Agendamento } from "@/hooks/useAgendamentos";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ConfirmarAtendimentoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  agendamento: Agendamento | null;
  isLoading?: boolean;
}

export function ConfirmarAtendimentoModal({
  isOpen,
  onClose,
  onConfirm,
  agendamento,
  isLoading = false,
}: ConfirmarAtendimentoModalProps) {
  if (!agendamento) return null;

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Data não informada";
    
    try {
      let dateToFormat;
      if (dateStr.includes('-') && dateStr.split('-').length === 3) {
        const parts = dateStr.split('-');
        if (parts[0].length === 2) {
          const [day, month, year] = parts;
          dateToFormat = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00`);
        } else {
          dateToFormat = new Date(dateStr + 'T00:00:00');
        }
      } else if (dateStr.includes('/')) {
        const [day, month, year] = dateStr.split('/');
        dateToFormat = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00`);
      } else {
        dateToFormat = new Date(dateStr);
      }
      
      return format(dateToFormat, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-card border-border shadow-2xl">
        <DialogHeader className="space-y-4">
          <div className="flex items-center justify-center">
            <div className="p-3 bg-green-500/10 rounded-full">
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
          </div>
          <DialogTitle className="text-center text-xl font-semibold">
            Confirmar Atendimento
          </DialogTitle>
          <DialogDescription className="text-center text-base">
            Você está prestes a confirmar que o cliente compareceu ao agendamento.
            <br />
            <span className="text-sm text-muted-foreground">
              Uma pesquisa de satisfação será enviada automaticamente.
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-6">
          <div className="bg-muted/30 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-3">
              <User className="w-4 h-4 text-primary" />
              <div>
                <p className="text-sm font-medium">{agendamento.name || "Cliente"}</p>
                {agendamento.email && (
                  <p className="text-xs text-muted-foreground">{agendamento.email}</p>
                )}
              </div>
            </div>

            {agendamento.number && (
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-primary" />
                <p className="text-sm">{agendamento.number}</p>
              </div>
            )}

            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-primary" />
              <p className="text-sm">{formatDate(agendamento.data)}</p>
            </div>

            {agendamento.hora && (
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-primary" />
                <p className="text-sm">{agendamento.hora}</p>
              </div>
            )}

            {agendamento.serviço && (
              <div className="pt-2">
                <Badge variant="secondary" className="text-xs">
                  {agendamento.serviço}
                </Badge>
              </div>
            )}
          </div>

          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
            <p className="text-xs text-blue-400 text-center">
              ✨ O cliente receberá uma pesquisa de satisfação via WhatsApp
            </p>
          </div>
        </div>

        <DialogFooter className="gap-3 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="w-full sm:w-auto bg-green-600 hover:bg-green-700 focus:ring-green-500"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                Confirmando...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Confirmar Atendimento
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}