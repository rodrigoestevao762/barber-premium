import { Settings, Sparkles, Bell } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-md">
        <h2 className="text-3xl font-serif text-white mb-8 flex items-center gap-3">
          <Settings className="text-amber-400" /> Ajustes do Studio • Lucas Augusto
        </h2>
        
        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-4">
             <h3 className="text-xl font-medium text-white flex items-center gap-2"><Sparkles className="w-5 h-5 text-[#DFBA73]"/> Meus Serviços Autorais</h3>
             <p className="text-gray-300 text-sm">Serviços e combos oficiais de Lucas Augusto (corte, barba, pigmentação, barboterapia e hidratação) com tabela de preços atualizada.</p>
             <button className="px-6 py-3 bg-white/10 text-white rounded-lg opacity-50 cursor-not-allowed font-mono text-xs uppercase tracking-wider">Tabela de Serviços 100% Ativa</button>
          </div>
          <div className="space-y-4">
             <h3 className="text-xl font-medium text-white flex items-center gap-2"><Bell className="w-5 h-5 text-amber-400"/> Notificações e Horários</h3>
             <p className="text-gray-300 text-sm">Horário oficial: Segunda a Sábado das 08:00 às 20:00. Domingos e feriados sob agendamento VIP antecipado.</p>
             <button className="px-6 py-3 bg-white/10 text-white rounded-lg opacity-50 cursor-not-allowed font-mono text-xs uppercase tracking-wider">08:00 às 20:00 Configurado</button>
          </div>
        </div>
      </div>
    </div>
  );
}
