import React from 'react';

export default function KindleLogo({ size = 72, className = '' }) {
  return (
    <div 
      className={`relative flex items-center justify-center select-none ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Resplandor azul ambiental */}
      <div 
        className="absolute inset-0 bg-[#007aff] rounded-3xl blur-xl opacity-35 animate-pulse"
        style={{ transform: 'scale(0.85)' }}
      />

      {/* Icono de Libro 3D Abierto */}
      <svg 
        viewBox="0 0 100 100" 
        width={size} 
        height={size} 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="relative z-10 drop-shadow-[0_8px_16px_rgba(0,122,255,0.45)]"
      >
        <defs>
          <linearGradient id="bookLeftGrad" x1="15" y1="20" x2="48" y2="80" gradientUnits="userSpaceOnUse">
            <stop stopColor="#38bdf8" />
            <stop offset="0.6" stopColor="#0284c7" />
            <stop offset="1" stopColor="#0369a1" />
          </linearGradient>
          <linearGradient id="bookRightGrad" x1="85" y1="20" x2="52" y2="80" gradientUnits="userSpaceOnUse">
            <stop stopColor="#60a5fa" />
            <stop offset="0.6" stopColor="#2563eb" />
            <stop offset="1" stopColor="#1d4ed8" />
          </linearGradient>
          <linearGradient id="spineGlow" x1="50" y1="22" x2="50" y2="82" gradientUnits="userSpaceOnUse">
            <stop stopColor="#93c5fd" />
            <stop offset="1" stopColor="#1e40af" />
          </linearGradient>
        </defs>

        {/* Página Izquierda con curvatura 3D */}
        <path
          d="M48 24C34 18 20 21 14 24C12.5 24.7 12 26 12 28V76C12 77.5 13.5 78.5 15 78C21 75.5 35 73 48 78V24Z"
          fill="url(#bookLeftGrad)"
        />
        {/* Línea interior izquierda */}
        <path
          d="M45 28C33 23 22 25 17 28V73C22 71 33 69 45 74V28Z"
          fill="#ffffff"
          fillOpacity="0.16"
        />

        {/* Página Derecha con curvatura 3D */}
        <path
          d="M52 24C66 18 80 21 86 24C87.5 24.7 88 26 88 28V76C88 77.5 86.5 78.5 85 78C79 75.5 65 73 52 78V24Z"
          fill="url(#bookRightGrad)"
        />
        {/* Línea interior derecha */}
        <path
          d="M55 28C67 23 78 25 83 28V73C78 71 67 69 55 74V28Z"
          fill="#ffffff"
          fillOpacity="0.22"
        />

        {/* Lomo Central del Libro */}
        <path
          d="M48 24C49.3 23.3 50.7 23.3 52 24V78C50.7 77.3 49.3 77.3 48 78V24Z"
          fill="url(#spineGlow)"
        />
      </svg>
    </div>
  );
}
