import React, { useState } from 'react';
import { BudgetProvider } from './context/BudgetContext';
import { useBudget } from './hooks/useBudget';
import ConfigPanel from './components/budget/ConfigPanel';
import MonthView from './components/budget/MonthView';
import ProvisionsView from './components/budget/AnnualView'; // ex AnnualView
import EnvelopesConfigView from './components/budget/EnvelopesConfigView'; // <-- NOUVEAU
import { LayoutDashboard, Settings, LogOut, Loader2, PiggyBank, Wallet } from 'lucide-react';

function AppContent() {
  const { user, loading, login, logout } = useBudget();
  const [view, setView] = useState('month');

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" size={40}/></div>;

  if (!user) { return ( <div className="h-screen flex flex-col items-center justify-center bg-slate-100"><div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md w-full"><h1 className="text-3xl font-bold text-slate-800 mb-2">BudgetMaster 2026 🔐</h1><button onClick={login} className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition">Se connecter avec Google</button></div></div> ); }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between overflow-x-auto">
          <div className="flex items-center gap-4 min-w-fit">{user.photoURL && <img src={user.photoURL} className="w-8 h-8 rounded-full" alt="avatar"/>}<h1 className="text-lg font-bold hidden md:block">Budget de {user.displayName}</h1></div>
          <div className="flex gap-2">
            <NavButton active={view === 'month'} onClick={() => setView('month')} icon={LayoutDashboard} label="Mensuel" />
            <NavButton active={view === 'envelopes'} onClick={() => setView('envelopes')} icon={Wallet} label="Enveloppes" />
            <NavButton active={view === 'provisions'} onClick={() => setView('provisions')} icon={PiggyBank} label="Provisions" />
            <NavButton active={view === 'config'} onClick={() => setView('config')} icon={Settings} label="Config" />
            <button onClick={logout} className="p-2 text-red-400 hover:bg-red-50 rounded-lg ml-2"><LogOut size={20}/></button>
          </div>
        </div>
      </nav>

      <main className="py-8">
        {view === 'month' && <MonthView />}
        {view === 'envelopes' && <EnvelopesConfigView />}
        {view === 'provisions' && <ProvisionsView />} 
        {view === 'config' && <ConfigPanel />}
      </main>
    </div>
  );
}

const NavButton = ({ active, onClick, icon: Icon, label }) => (
  <button onClick={onClick} className={`px-3 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm font-medium ${active ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-50'}`}><Icon size={18} /> <span className="hidden sm:inline">{label}</span></button>
);

export default function App() {
  return (
    <BudgetProvider>
      <AppContent />
    </BudgetProvider>
  );
}