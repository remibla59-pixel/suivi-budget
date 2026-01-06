import React, { useState } from 'react';
import { BudgetProvider } from './context/BudgetContext';
import { useBudget } from './hooks/useBudget';
import ConfigPanel from './components/budget/ConfigPanel';
import MonthView from './components/budget/MonthView';
import { LayoutDashboard, Settings, LogOut, Loader2 } from 'lucide-react';

function AppContent() {
  const { user, loading, login, logout } = useBudget();
  const [view, setView] = useState('month');

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" size={40}/></div>;

  // ÉCRAN DE CONNEXION
  if (!user) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-100">
        <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md w-full">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">BudgetMaster 2026 🔐</h1>
          <p className="text-slate-500 mb-8">Connectez-vous pour accéder à vos comptes.</p>
          <button onClick={login} className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition flex justify-center gap-2">
            Se connecter avec Google
          </button>
        </div>
      </div>
    );
  }

  // APPLICATION PRINCIPALE
  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
             {user.photoURL && <img src={user.photoURL} className="w-8 h-8 rounded-full" alt="avatar"/>}
             <h1 className="text-lg font-bold hidden sm:block">Budget de {user.displayName}</h1>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setView('month')} className={`p-2 rounded-lg ${view === 'month' ? 'bg-blue-50 text-blue-700' : 'text-slate-500'}`}><LayoutDashboard size={20}/></button>
            <button onClick={() => setView('config')} className={`p-2 rounded-lg ${view === 'config' ? 'bg-blue-50 text-blue-700' : 'text-slate-500'}`}><Settings size={20}/></button>
            <button onClick={logout} className="p-2 text-red-400 hover:bg-red-50 rounded-lg ml-2"><LogOut size={20}/></button>
          </div>
        </div>
      </nav>

      <main className="py-8">
        {view === 'month' ? <MonthView /> : <ConfigPanel />}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BudgetProvider>
      <AppContent />
    </BudgetProvider>
  );
}