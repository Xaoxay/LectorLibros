import React from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Heart, CheckCircle2, Compass } from 'lucide-react';
import { hapticLight } from '../services/haptics';

export default function BottomNavBar({
  activeTab = 'all',
  onSelectTab,
  totalBooks = 0,
  favoritesCount = 0,
  completedCount = 0,
  onOpenCatalog,
}) {
  const tabs = [
    {
      id: 'all',
      label: 'Biblioteca',
      icon: BookOpen,
      count: totalBooks,
      color: 'text-amber-400',
    },
    {
      id: 'favorites',
      label: 'Favoritos',
      icon: Heart,
      count: favoritesCount,
      color: 'text-rose-400',
    },
    {
      id: 'completed',
      label: 'Leídos',
      icon: CheckCircle2,
      count: completedCount,
      color: 'text-emerald-400',
    },
    {
      id: 'catalog',
      label: 'Catálogo',
      icon: Compass,
      badge: '+70k',
      color: 'text-indigo-400',
    },
  ];

  const handleTabClick = (tab) => {
    hapticLight();
    if (tab.id === 'catalog') {
      if (onOpenCatalog) onOpenCatalog();
    } else {
      if (onSelectTab) onSelectTab(tab.id);
    }
  };

  return (
    <nav 
      aria-label="Navegación principal inferior"
      className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/85 backdrop-blur-2xl border-t border-white/10 safe-bottom shadow-2xl select-none"
    >
      <div className="max-w-lg mx-auto h-16 sm:h-18 px-2 flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab)}
              className="relative flex-1 flex flex-col items-center justify-center py-1 group cursor-pointer focus:outline-none"
            >
              {/* Contenedor del ícono con píldora indicadora activa (Material You Active Pill Indicator) */}
              <div className="relative">
                <motion.div
                  whileTap={{ scale: 0.88 }}
                  transition={{ type: 'spring', stiffness: 450, damping: 25 }}
                  className={`w-14 sm:w-16 h-8 sm:h-9 rounded-full flex items-center justify-center transition-all ${
                    isActive 
                      ? 'bg-amber-400/20 border border-amber-400/40 text-amber-300 shadow-sm shadow-amber-400/15' 
                      : 'text-slate-400 group-hover:text-slate-200 group-hover:bg-white/5'
                  }`}
                >
                  <Icon 
                    className={`w-5 h-5 transition-transform duration-200 ${
                      isActive ? 'scale-110 stroke-[2.4]' : 'stroke-[1.8]'
                    }`} 
                  />
                </motion.div>

                {/* Badge numérico en esquina superior del ícono */}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black flex items-center justify-center shadow-md">
                    {tab.count > 99 ? '99+' : tab.count}
                  </span>
                )}

                {/* Badge de texto (ej. +70k para catálogo) */}
                {tab.badge && (
                  <span className="absolute -top-1 -right-2 text-[9px] font-extrabold px-1.5 py-0.2 rounded-full bg-indigo-500 text-white shadow-sm">
                    {tab.badge}
                  </span>
                )}
              </div>

              {/* Etiqueta tipográfica inferior */}
              <span 
                className={`text-[11px] mt-1 tracking-tight font-medium transition-colors ${
                  isActive ? 'text-amber-300 font-bold' : 'text-slate-400 group-hover:text-slate-300'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
