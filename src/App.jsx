import React, { useState } from 'react';
import { BudgetProvider } from './context/BudgetContext';
import { useBudget } from './hooks/useBudget';

import ConfigPanel from './components/budget/ConfigPanel';
import MonthView from './components/budget/MonthView';
import AnnualView from './components/budget/AnnualView'; 
import EnvelopesConfigView from './components/budget/EnvelopesConfigView';
import SavingsView from './components/budget/SavingsView';
import ProjectsView from './components/budget/ProjectsView'; // NOUVEAU

import { 
  LayoutDashboard, Settings, LogOut, Loader2, 
  PiggyBank, Wallet, ShieldCheck, Target 
} from 'lucide-react';

function AppContent() {
  const { user, loading, login, logout } = useBudget();
  const [view, setView] = useState('month');

  if (loading) {
    return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" size={40}/></div>;
  }

  if (!user) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-100 p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl text-center max-w-md w-full border border-slate-200">
          <div className="bg-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-200">
            <Wallet className="text-white" size={32} />
          </div>
          <h1 className="text-3xl font-black text-slate-800 mb-2">BudgetMaster</h1>
          <p className="text-slate-500 mb-8 font-medium">Gérez vos enveloppes et provisions en toute simplicité.</p>
          <button onClick={login} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold hover:bg-black transition-all transform active:scale-95 shadow-xl">
            Se connecter avec Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans">
      {/* BARRE DE NAVIGATION */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between gap-4 overflow-x-auto">
          
          <div className="flex items-center gap-3 min-w-fit">
             {user.photoURL ? (
               <img src={user.photoURL} className="w-10 h-10 rounded-xl shadow-sm border border-slate-100" alt="avatar"/>
             ) : (
               <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 font-bold uppercase">
                 {user.displayName?.charAt(0)}
               </div>
             )}
             <div className="hidden lg:block">
               <h1 className="text-sm font-black text-slate-800 leading-tight">Budget Perso</h1>
               <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{user.displayName}</span>
             </div>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl">
            <NavButton active={view === 'month'} onClick={() => setView('month')} icon={LayoutDashboard} label="Mensuel" />
            <NavButton active={view === 'envelopes'} onClick={() => setView('envelopes')} icon={Wallet} label="Env." />
            <NavButton active={view === 'annual'} onClick={() => setView('annual')} icon={PiggyBank} label="Prov." />
            <NavButton active={view === 'projects'} onClick={() => setView('projects')} icon={Target} label="Projets" />
            <NavButton active={view === 'savings'} onClick={() => setView('savings')} icon={ShieldCheck} label="Épargne" />
            <NavButton active={view === 'config'} onClick={() => setView('config')} icon={Settings} label="Config" />
          </div>

          <button onClick={logout} className="p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all" title="Déconnexion">
            <LogOut size={20}/>
          </button>
        </div>
      </nav>

      {/* CONTENU PRINCIPAL */}
      <main className="py-8 animate-in fade-in duration-500">
        {view === 'month' && <MonthView />}
        {view === 'envelopes' && <EnvelopesConfigView />}
        {view === 'annual' && <AnnualView />} 
        {view === 'projects' && <ProjectsView />}
        {view === 'savings' && <SavingsView />}
        {view === 'config' && <ConfigPanel />}
      </main>
    </div>
  );
}

const NavButton = ({ active, onClick, icon: Icon, label }) => (
  <button 
    onClick={onClick} 
    className={`px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all duration-300 text-sm font-bold ${
      active ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
    }`}
  >
    <Icon size={18} className={active ? 'text-blue-600' : 'text-slate-400'} />
    <span className="hidden sm:inline">{label}</span>
  </button>
);

export default function App() {
  return (
    <BudgetProvider>
      <AppContent />
    </BudgetProvider>
  );
}