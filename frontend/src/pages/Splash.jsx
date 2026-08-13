import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const CRAYON_COLORS = ['#EF4444', '#F97316', '#FACC15', '#22C55E', '#3B82F6', '#A855F7', '#EC4899'];

export default function Splash() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 1000),
      setTimeout(() => setPhase(2), 2100),
      setTimeout(() => navigate('/home'), 3500),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #FEF3C7 0%, #FCE7F3 50%, #E9D5FF 100%)' }}>

      {/* Falling crayons */}
      <div className="absolute inset-0 pointer-events-none">
        {CRAYON_COLORS.map((color, i) => (
          <motion.div
            key={i}
            className="absolute rounded-lg"
            style={{ background: color, width: 10, height: 50 }}
            initial={{ y: -100, x: `${8 + i * 12}%`, rotate: 0, opacity: 0 }}
            animate={{
              y: phase >= 1 ? '110vh' : '40vh',
              rotate: phase >= 1 ? 720 : 180,
              opacity: phase >= 1 ? 0 : [0, 1, 0.3],
            }}
            transition={{ duration: phase >= 1 ? 1.5 : 1, delay: i * 0.08, ease: 'easeIn' }}
          />
        ))}
      </div>

      {/* Logo drawing animation */}
      <motion.div
        className="relative flex items-end justify-center gap-1"
        style={{ height: 130 }}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {CRAYON_COLORS.map((color, i) => (
          <motion.div
            key={i}
            className="relative"
            style={{ width: 16 }}
            initial={{ height: 0 }}
            animate={{ height: phase >= 1 ? 95 : 0 }}
            transition={{ duration: 0.4, delay: 0.5 + i * 0.1, ease: 'easeOut' }}
          >
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 20, background: color, clipPath: 'polygon(0 100%, 50% 0, 100% 100%)' }} />
            <div style={{ position: 'absolute', top: 20, left: 0, right: 0, bottom: 0, background: color, borderRadius: '0 0 4px 4px' }} />
            <div style={{ position: 'absolute', top: 35, left: 0, right: 0, height: 12, background: 'rgba(255,255,255,0.35)' }} />
          </motion.div>
        ))}
      </motion.div>

      <motion.h1
        className="rainbow-text font-display font-bold text-3xl sm:text-5xl mt-3 tracking-tight"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: phase >= 1 ? 1 : 0, y: phase >= 1 ? 0 : 15 }}
        transition={{ duration: 0.5 }}
      >
        Crayon Cookout
      </motion.h1>

      <AnimatePresence>
        {phase >= 2 && (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-purple-500 font-body font-medium text-sm sm:text-lg mt-2 text-center px-6"
          >
            ✨ Every Crayon Deserves a Second Stroke ✨
          </motion.p>
        )}
      </AnimatePresence>

      {/* Loading dots */}
      <div className="flex gap-2 mt-8">
        {CRAYON_COLORS.slice(0, 3).map((c, i) => (
          <motion.div
            key={i}
            className="w-3 h-3 rounded-full"
            style={{ background: c }}
            animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
      </div>
    </div>
  );
}