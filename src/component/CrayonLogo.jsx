import React from 'react';

const CRAYON_COLORS = ['#EF4444', '#F97316', '#FACC15', '#22C55E', '#3B82F6', '#A855F7', '#EC4899'];

export default function CrayonLogo({ size = 120, showText = true, textClass = 'text-2xl' }) {
  const crayonWidth = size * 0.11;
  const crayonHeight = size * 0.7;

  return (
    <div className="flex flex-col items-center select-none">
      <div className="flex items-end justify-center gap-0.5" style={{ height: size }}>
        {CRAYON_COLORS.map((color, i) => {
          const h = crayonHeight * (0.85 + Math.sin(i * 1.3) * 0.2);
          return (
            <div
              key={i}
              className="relative"
              style={{
                width: crayonWidth,
                height: h,
                transform: `rotate(${(i - 3) * 4}deg)`,
                transformOrigin: 'bottom center',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 0, left: 0, right: 0,
                  height: crayonHeight * 0.22,
                  background: color,
                  clipPath: 'polygon(0 100%, 50% 0, 100% 100%)',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  top: crayonHeight * 0.22, left: 0, right: 0, bottom: 0,
                  background: color,
                  borderRadius: '0 0 3px 3px',
                  boxShadow: 'inset -2px 0 4px rgba(0,0,0,0.1)',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  top: crayonHeight * 0.4, left: 0, right: 0,
                  height: crayonHeight * 0.14,
                  background: 'rgba(255,255,255,0.35)',
                }}
              />
            </div>
          );
        })}
      </div>
      {showText && (
        <h1 className={`rainbow-text font-display font-bold ${textClass} mt-1 tracking-tight`}>
          Crayon Cookout
        </h1>
      )}
    </div>
  );
}