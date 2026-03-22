'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const MESSAGES = [
  'Afinando los instrumentos...',
  'Preparando el escenario...',
  'Cargando la setlist...',
  'El show está por comenzar...',
];

export default function Loading() {
  const [msgIdx, setMsgIdx] = useState(0);
  const [progress, setProgress] = useState(15);

  useEffect(() => {
    // Avanzar mensaje cada 800ms
    const msgInterval = setInterval(() => {
      setMsgIdx(i => (i + 1) % MESSAGES.length);
    }, 800);

    // Simular progreso que nunca llega al 100 (Next.js desmonta cuando termina)
    const progInterval = setInterval(() => {
      setProgress(p => {
        if (p >= 85) return p; // Se detiene en 85, nunca llega solo al 100
        return p + Math.random() * 12;
      });
    }, 400);

    return () => {
      clearInterval(msgInterval);
      clearInterval(progInterval);
    };
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#000',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        gap: 0,
      }}
    >
      {/* Partículas flotantes */}
      {[...Array(7)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ y: 0, opacity: 0 }}
          animate={{ y: -600, opacity: [0, 0.5, 0] }}
          transition={{
            duration: 5 + i * 0.4,
            delay: i * 0.7,
            repeat: Infinity,
            ease: 'linear',
          }}
          style={{
            position: 'absolute',
            bottom: 0,
            left: `${10 + i * 13}%`,
            width: i % 2 === 0 ? 3 : 2,
            height: i % 2 === 0 ? 3 : 2,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.07)',
            pointerEvents: 'none',
          }}
        />
      ))}

      {/* Anillos giratorios */}
      <div style={{ position: 'relative', width: 72, height: 72, marginBottom: 32 }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            border: '1.5px solid transparent',
            borderTopColor: 'rgba(255,255,255,0.38)',
            borderRightColor: 'rgba(255,255,255,0.1)',
          }}
        />
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          style={{
            position: 'absolute', inset: 12, borderRadius: '50%',
            border: '1.5px solid transparent',
            borderTopColor: 'rgba(34,211,238,0.65)',
            borderLeftColor: 'rgba(34,211,238,0.22)',
          }}
        />
        {/* Icono central */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
            stroke="rgba(255,255,255,0.45)" strokeWidth="2" strokeLinecap="round">
            <path d="M9 18V5l12-2v13" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="18" cy="16" r="3" />
          </svg>
        </div>
      </div>

      {/* Título */}
      <p style={{
        fontSize: 22,
        fontWeight: 800,
        color: '#fff',
        letterSpacing: '-0.5px',
        textTransform: 'uppercase',
        fontStyle: 'italic',
        marginBottom: 4,
      }}>
        MusicTCG
      </p>
      <p style={{
        fontSize: 10,
        fontWeight: 700,
        color: 'rgba(255,255,255,0.22)',
        letterSpacing: '0.25em',
        textTransform: 'uppercase',
        marginBottom: 32,
      }}>
        The Rhythm Card Game
      </p>

      {/* Barra de progreso */}
      <div style={{ width: 200 }}>
        <div style={{
          height: 2, background: 'rgba(255,255,255,0.07)',
          borderRadius: 2, overflow: 'hidden', marginBottom: 10,
        }}>
          <motion.div
            animate={{ width: `${Math.min(progress, 85)}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            style={{
              height: '100%',
              background: 'linear-gradient(90deg, rgba(34,211,238,0.9), rgba(59,130,246,0.9))',
              borderRadius: 2,
            }}
          />
        </div>

        {/* Mensaje rotativo */}
        <AnimatePresence mode="wait">
          <motion.p
            key={msgIdx}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            style={{
              textAlign: 'center',
              fontSize: 10,
              fontWeight: 700,
              color: 'rgba(255,255,255,0.22)',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
            }}
          >
            {MESSAGES[msgIdx]}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}
