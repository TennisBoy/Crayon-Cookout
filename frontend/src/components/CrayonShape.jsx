import React from 'react';
import { SHAPES } from '@/lib/premium';

export default function CrayonShape({ colors = [], heights = [], shape = 'crayon', width = 120, height = 160, greyed = false, showOutline = true }) {
  const shapeData = SHAPES[shape] || SHAPES.crayon;
  const total = heights.reduce((a, b) => a + b, 0) || 1;
  let bottom = 0;

  // Each clipPath was drawn for a box of a particular shape — the crayon tall,
  // the moulds square. Filling the caller's box regardless would stretch a star
  // into a spike. Instead fit the largest correctly-proportioned box inside
  // what the caller gave us and centre it, so layouts stay put.
  const aspect = shapeData.aspect ?? 0.5;
  const innerWidth = Math.min(width, height * aspect);
  const innerHeight = innerWidth / aspect;

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width, height }}
    >
      <div
        className="relative overflow-hidden"
        style={{
          width: innerWidth,
          height: innerHeight,
          clipPath: shapeData.clipPath,
          WebkitClipPath: shapeData.clipPath,
          background: greyed ? '#E5E7EB' : '#F9FAFB',
          border: showOutline ? '3px solid #E8E0D5' : 'none',
        }}
      >
        {colors.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-300 text-xs font-body">
            Pour wax!
          </div>
        )}
        {colors.map((color, i) => {
          const h = (heights[i] / total) * 100;
          const seg = (
            <div
              key={i}
              style={{
                position: 'absolute',
                bottom: `${bottom}%`,
                left: 0, right: 0,
                height: `${h}%`,
                background: greyed ? '#D1D5DB' : color,
              }}
            />
          );
          bottom += h;
          return seg;
        })}
      </div>
    </div>
  );
}
