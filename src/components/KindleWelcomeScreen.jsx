import React from 'react';
import KindleLogo from './KindleLogo';
import { hapticMedium, hapticLight } from '../services/haptics';

export default function KindleWelcomeScreen({ onStart, onLogin }) {
  return (
    <div className="min-h-full w-full bg-[#0b0f19] text-white flex flex-col justify-between p-6 select-none relative overflow-hidden safe-top safe-bottom">
      {/* Resplandor ambiental de fondo */}
      <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[350px] h-[350px] bg-[#007aff]/15 rounded-full blur-3xl pointer-events-none" />

      {/* 1. Header con Logo y Título */}
      <div className="flex flex-col items-center text-center pt-8 z-10">
        <KindleLogo size={78} className="mb-4" />
        <h1 className="text-3xl font-black tracking-tight text-white mb-1.5">
          Kindle Clone
        </h1>
        <p className="text-sm font-medium text-slate-400">
          Tus libros, siempre contigo.
        </p>
      </div>

      {/* 2. Hero Visual: Lector al atardecer (Estilo Mockup Pantalla 1) */}
      <div className="relative my-auto w-full max-w-sm mx-auto aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl border border-slate-800/80 bg-gradient-to-b from-amber-900/20 via-slate-900/60 to-[#0b0f19] flex items-end justify-center">
        {/* Gráfico artístico del lector y atardecer */}
        <svg
          viewBox="0 0 400 300"
          className="w-full h-full object-cover"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <radialGradient id="sunGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fed7aa" stopOpacity="1" />
              <stop offset="35%" stopColor="#f97316" stopOpacity="0.85" />
              <stop offset="70%" stopColor="#ea580c" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#7c2d12" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1e1b4b" />
              <stop offset="40%" stopColor="#3b0764" />
              <stop offset="65%" stopColor="#9a3412" />
              <stop offset="85%" stopColor="#ea580c" />
              <stop offset="100%" stopColor="#c2410c" />
            </linearGradient>
            <linearGradient id="waterGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ea580c" stopOpacity="0.6" />
              <stop offset="30%" stopColor="#7c2d12" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#0b0f19" stopOpacity="1" />
            </linearGradient>
          </defs>

          {/* Cielo al atardecer */}
          <rect width="400" height="200" fill="url(#skyGrad)" />

          {/* Sol poniente */}
          <circle cx="200" cy="155" r="70" fill="url(#sunGlow)" />
          <circle cx="200" cy="155" r="28" fill="#fffbeb" />

          {/* Montañas en el horizonte */}
          <path
            d="M0 165 Q70 145 130 155 Q190 165 240 150 Q310 135 400 160 L400 200 L0 200 Z"
            fill="#451a03"
            opacity="0.8"
          />
          <path
            d="M0 175 Q90 160 180 170 Q270 180 400 165 L400 210 L0 210 Z"
            fill="#271106"
          />

          {/* Agua con reflejo */}
          <rect y="195" width="400" height="105" fill="url(#waterGrad)" />
          <ellipse cx="200" cy="205" rx="45" ry="5" fill="#fde68a" opacity="0.4" />
          <ellipse cx="200" cy="220" rx="30" ry="4" fill="#f97316" opacity="0.3" />

          {/* Isla / Colina con silueta de persona leyendo */}
          <path
            d="M50 300 Q100 230 160 225 Q200 222 230 250 Q260 280 290 300 Z"
            fill="#090d15"
          />
          
          {/* Silueta del lector con su libro */}
          {/* Cuerpo sentado */}
          <path
            d="M135 245 C130 240 130 232 135 228 C140 224 146 226 148 232 C150 238 148 245 142 248 Z"
            fill="#05080f"
          />
          {/* Torso inclinado */}
          <path
            d="M138 238 C145 240 155 243 158 255 C155 262 145 265 135 260 C130 252 132 242 138 238 Z"
            fill="#05080f"
          />
          {/* Piernas recogidas */}
          <path
            d="M135 260 C140 262 165 262 172 258 C176 256 180 262 174 266 C162 272 138 270 130 264 Z"
            fill="#05080f"
          />
          {/* Brazos sosteniendo el libro */}
          <path
            d="M148 246 C155 248 162 250 166 247"
            stroke="#05080f"
            strokeWidth="4"
            strokeLinecap="round"
          />
          {/* Libro abierto brillante reflejando la luz */}
          <path
            d="M165 244 L171 241 L177 245 L171 247 Z"
            fill="#fef08a"
            opacity="0.9"
          />
        </svg>

        {/* Gradiente de difuminado inferior */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b0f19] via-transparent to-transparent" />
      </div>

      {/* 3. Texto descriptivo y Botones de Acción */}
      <div className="w-full max-w-sm mx-auto text-center z-10 pb-4">
        <p className="text-xs text-slate-400 max-w-xs mx-auto mb-6 leading-relaxed font-normal">
          Lee, descubre y guarda tus historias en un solo lugar.
        </p>

        {/* Botón Comenzar (Azul #007aff) */}
        <button
          onClick={() => {
            hapticMedium();
            onStart();
          }}
          className="w-full py-4 px-6 rounded-2xl bg-[#007aff] hover:bg-[#0066d6] active:scale-[0.98] text-white font-extrabold text-sm shadow-xl shadow-[#007aff]/30 transition-all cursor-pointer mb-3"
        >
          Comenzar
        </button>

        {/* Enlace Iniciar sesión */}
        <button
          onClick={() => {
            hapticLight();
            onLogin();
          }}
          className="text-xs font-semibold text-[#007aff] hover:text-blue-400 py-2 px-4 transition-colors cursor-pointer"
        >
          Iniciar sesión
        </button>
      </div>
    </div>
  );
}
