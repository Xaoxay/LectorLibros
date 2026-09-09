import React from 'react';
import { Home, BookOpen, UploadCloud, User } from 'lucide-react';
import { hapticLight } from '../services/haptics';

export default function KindleBottomNav({ activeTab = 'biblioteca', onTabChange }) {
  const tabs = [
    { id: 'inicio', label: 'Inicio', icon: Home },
    { id: 'biblioteca', label: 'Biblioteca', icon: BookOpen },
    { id: 'subir', label: 'Subir', icon: UploadCloud },
    { id: 'perfil', label: 'Perfil', icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#0d111c]/95 backdrop-blur-xl border-t border-slate-800/80 px-4 py-2 flex items-center justify-around safe-bottom select-none">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => {
              hapticLight();
              onTabChange(tab.id);
            }}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all cursor-pointer ${
              isActive
                ? 'text-[#007aff]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className={`relative p-1 rounded-xl transition-all ${
              isActive ? 'scale-110' : ''
            }`}>
              <Icon className="w-5 h-5 stroke-[2.2]" />
              {isActive && (
                <div className="absolute inset-0 bg-[#007aff]/20 blur-xs rounded-full" />
              )}
            </div>
            <span className={`text-[10px] tracking-tight font-bold mt-0.5 ${
              isActive ? 'text-[#007aff]' : 'text-slate-400'
            }`}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
