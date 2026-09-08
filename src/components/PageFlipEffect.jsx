import React from 'react';
import { motion } from 'framer-motion';

export default function PageFlipEffect({ flipping, theme = 'sepia', direction = 'ltr' }) {
  if (!flipping) return null;

  const isNext = flipping === 'next';
  const isRtl = direction === 'rtl';

  const paperColors = {
    sepia: '#f6eedb',
    light: '#fbfbf8',
    dark: '#1e212b',
    amoled: '#111216',
  }[theme] || '#f6eedb';

  // Ángulos y transformaciones según sentido de lectura LTR (Libro/PDF) o RTL (Manga)
  const transformOrigin = isRtl ? 'right center' : 'left center';

  let startRotateY = 0;
  let endRotateY = 0;
  let skewArray = [0, 0];

  if (!isRtl) {
    // Lectura occidental: la hoja pasa de derecha a izquierda sobre el lomo izquierdo
    startRotateY = isNext ? 0 : -180;
    endRotateY = isNext ? -180 : 0;
    skewArray = isNext ? [0, -3.5, 0] : [-3.5, 0];
  } else {
    // Manga oriental: la hoja pasa de izquierda a derecha sobre el lomo derecho
    startRotateY = isNext ? 0 : 180;
    endRotateY = isNext ? 180 : 0;
    skewArray = isNext ? [0, 3.5, 0] : [3.5, 0];
  }

  return (
    <div className="absolute inset-0 z-40 pointer-events-none overflow-hidden" style={{ perspective: '2000px' }}>
      {/* 1. Sombra proyectada sobre la página inferior mientras la hoja se arquea y levanta */}
      <motion.div
        initial={{
          opacity: 0.65,
          scaleX: 1,
          x: isNext ? (isRtl ? '-20%' : '20%') : '0%',
        }}
        animate={{
          opacity: 0,
          scaleX: 0.2,
          x: isNext ? (isRtl ? '80%' : '-80%') : (isRtl ? '-60%' : '60%'),
        }}
        transition={{ duration: 0.38, ease: 'easeOut' }}
        className="absolute inset-0 pointer-events-none"
        style={{
          background: isNext
            ? (isRtl 
                ? 'linear-gradient(to right, rgba(0,0,0,0.38) 0%, transparent 65%)'
                : 'linear-gradient(to left, rgba(0,0,0,0.38) 0%, transparent 65%)')
            : (isRtl
                ? 'linear-gradient(to left, rgba(0,0,0,0.38) 0%, transparent 65%)'
                : 'linear-gradient(to right, rgba(0,0,0,0.38) 0%, transparent 65%)'),
        }}
      />

      {/* 2. Hoja física de papel arqueándose y volteándose en 3D */}
      <motion.div
        initial={{
          rotateY: startRotateY,
          rotateX: 0,
          skewY: skewArray[0],
          opacity: 1,
          boxShadow: isNext ? '0 10px 30px rgba(0,0,0,0.2)' : '-25px 0 35px rgba(0,0,0,0.4)',
        }}
        animate={{
          rotateY: endRotateY,
          rotateX: [0, 3.5, 0],
          skewY: skewArray[1] !== undefined ? skewArray[1] : 0,
          opacity: [1, 1, 0.95, 0],
          boxShadow: isNext
            ? [
                '0 6px 16px rgba(0,0,0,0.15)',
                '-32px 12px 48px rgba(0,0,0,0.48)',
                '-12px 6px 22px rgba(0,0,0,0.22)',
                'none'
              ]
            : [
                '-32px 12px 48px rgba(0,0,0,0.48)',
                '-16px 6px 26px rgba(0,0,0,0.26)',
                '0 6px 16px rgba(0,0,0,0.15)',
                'none'
              ]
        }}
        transition={{
          duration: 0.42,
          ease: [0.22, 0.61, 0.36, 1],
        }}
        style={{
          position: 'absolute',
          inset: 0,
          transformOrigin,
          transformStyle: 'preserve-3d',
          backgroundColor: paperColors,
          borderRight: !isRtl && isNext ? '1px solid rgba(0,0,0,0.12)' : 'none',
          borderLeft: isRtl && isNext ? '1px solid rgba(0,0,0,0.12)' : 'none',
        }}
      >
        {/* Relieve cilíndrico de luz y sombra sobre el pliegue curvo del papel */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: isNext
              ? 'linear-gradient(to right, rgba(0,0,0,0.22) 0%, rgba(255,255,255,0.3) 42%, rgba(0,0,0,0.25) 75%, transparent 100%)'
              : 'linear-gradient(to left, rgba(0,0,0,0.22) 0%, rgba(255,255,255,0.3) 42%, rgba(0,0,0,0.25) 75%, transparent 100%)',
          }}
        />

        {/* Impresión y líneas fantasma sutiles en la hoja física */}
        <div className="absolute inset-8 opacity-15 flex flex-col gap-3.5 pointer-events-none">
          <div className="h-2 w-3/4 bg-current rounded-full" />
          <div className="h-2 w-full bg-current rounded-full" />
          <div className="h-2 w-5/6 bg-current rounded-full" />
          <div className="h-2 w-4/5 bg-current rounded-full" />
          <div className="h-2 w-full bg-current rounded-full" />
          <div className="h-2 w-2/3 bg-current rounded-full" />
          <div className="h-2 w-11/12 bg-current rounded-full" />
          <div className="h-2 w-3/5 bg-current rounded-full" />
        </div>
      </motion.div>
    </div>
  );
}
