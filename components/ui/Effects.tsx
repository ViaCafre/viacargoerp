import React, { useEffect, useState, useRef } from 'react';
import { motion, useSpring, useTransform, animate } from 'framer-motion';
import { formatCurrency } from '../../types';

// --- ANIMATED COUNTER ---
interface AnimatedCounterProps {
  value: number;
  className?: string;
}

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({ value, className }) => {
  // Use a spring for smooth "premium" feeling deceleration
  const springValue = useSpring(value, {
    stiffness: 45,
    damping: 15,
    mass: 1,
  });

  // Update spring target when value changes
  useEffect(() => {
    springValue.set(value);
  }, [value, springValue]);

  // Transform number to currency string - REMOVED Math.floor to keep cents
  const displayValue = useTransform(springValue, (current) => formatCurrency(current));

  return <motion.span className={className}>{displayValue}</motion.span>;
};

// --- MONEY RAIN EFFECT ---
export const MoneyRain = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [particles, setParticles] = useState<any[]>([]);

  useEffect(() => {
    // Generate particles
    const newParticles = Array.from({ length: 40 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100, // percentage
      delay: Math.random() * 2,
      duration: 2 + Math.random() * 2,
      type: Math.random() > 0.7 ? 'coin' : 'bill', // 30% coins, 70% bills
      scale: 0.5 + Math.random() * 0.5,
      rotation: Math.random() * 360,
    }));
    setParticles(newParticles);
  }, []);

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden pointer-events-none z-20">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ 
            y: -50, 
            x: `${p.x}%`, 
            opacity: 0, 
            rotate: 0 
          }}
          animate={{ 
            y: 400, // Drop down past container
            opacity: [0, 1, 1, 0], 
            rotate: p.rotation + 360 
          }} 
          transition={{ 
            duration: p.duration, 
            delay: p.delay,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute top-0 text-emerald-400 font-bold"
          style={{ 
            scale: p.scale,
            left: 0 // Position handled by initial x
          }}
        >
          {p.type === 'coin' ? (
             <div className="w-3 h-3 rounded-full bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.6)] border border-yellow-200" />
          ) : (
             <div className="w-6 h-3 bg-emerald-500 rounded-sm shadow-[0_0_10px_rgba(16,185,129,0.4)] border border-emerald-300 opacity-80" />
          )}
        </motion.div>
      ))}
    </div>
  );
};