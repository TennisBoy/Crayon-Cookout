import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { create as createDesign } from '@/lib/adapters/designs';
import { FREE_COLORS, LOCKED_COLORS, SHAPES, hasKitchenAccess } from '@/lib/premium';
import CrayonShape from '@/components/CrayonShape';
import { Lock, Droplet, Pencil, Eraser, Save, Trash2, Brush } from 'lucide-react';

const TOOLS = [
  { id: 'pour', name: 'Pour Wax', icon: Droplet },
  { id: 'draw', name: 'Draw', icon: Pencil },
  { id: 'erase', name: 'Erase', icon: Eraser },
];

const CANVAS_W = 140;
const CANVAS_H = 280;
const DRAW_WIDTH = 7;
const ERASE_WIDTH = 16;

export default function Kitchen() {
  const navigate = useNavigate();
  const hasAccess = hasKitchenAccess();
  const [selectedColor, setSelectedColor] = useState(FREE_COLORS[0].hex);
  const [selectedTool, setSelectedTool] = useState('pour');
  const [selectedShape, setSelectedShape] = useState('crayon');
  const [segments, setSegments] = useState([]);
  const [pouring, setPouring] = useState(false);
  const [showSave, setShowSave] = useState(false);
  const [designName, setDesignName] = useState('');
  const [saving, setSaving] = useState(false);
  const [lockedMsg, setLockedMsg] = useState('');
  const colorInputRef = useRef(null);
  const drawCanvasRef = useRef(null);
  const drawingRef = useRef(false);
  const lastPosRef = useRef(null);

  const totalHeight = segments.reduce((a, s) => a + s.height, 0);
  const shapeClip = SHAPES[selectedShape]?.clipPath;

  // Clear drawing canvas when shape changes
  useEffect(() => {
    clearDrawing();
  }, [selectedShape]);

  const clearDrawing = () => {
    const canvas = drawCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const handleCrayonClick = () => {
    if (pouring || selectedTool !== 'pour') return;
    if (totalHeight >= 100) return;
    const actualHeight = Math.min(25, 100 - totalHeight);
    setPouring(true);
    setTimeout(() => {
      setSegments(prev => [...prev, { color: selectedColor, height: actualHeight }]);
      setPouring(false);
    }, 600);
  };

  const showLocked = (msg) => {
    setLockedMsg(msg);
    setTimeout(() => setLockedMsg(''), 2500);
  };

  const getCanvasPos = (e) => {
    const canvas = drawCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX ?? e.touches?.[0]?.clientX;
    const clientY = e.clientY ?? e.touches?.[0]?.clientY;
    return {
      x: ((clientX - rect.left) / rect.width) * canvas.width,
      y: ((clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const handleDrawStart = (e) => {
    if (selectedTool === 'pour') {
      handleCrayonClick();
      return;
    }
    e.preventDefault();
    drawingRef.current = true;
    lastPosRef.current = getCanvasPos(e);
  };

  const handleDrawMove = (e) => {
    if (!drawingRef.current) return;
    e.preventDefault();
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const pos = getCanvasPos(e);
    ctx.lineWidth = selectedTool === 'erase' ? ERASE_WIDTH : DRAW_WIDTH;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalCompositeOperation = selectedTool === 'erase' ? 'destination-out' : 'source-over';
    ctx.strokeStyle = selectedColor;
    ctx.beginPath();
    ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPosRef.current = pos;
  };

  const handleDrawEnd = () => {
    drawingRef.current = false;
    lastPosRef.current = null;
  };

  const handleSave = async () => {
    if (segments.length === 0) return;
    setSaving(true);
    try {
      await createDesign({
        name: designName || 'My Crayon Design',
        colors: segments.map(s => s.color),
        heights: segments.map(s => s.height),
        shape: selectedShape,
      });
      setSaving(false);
      setShowSave(false);
      setDesignName('');
      navigate('/library');
    } catch (e) {
      setSaving(false);
      alert('Could not save design. Please try again.');
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-3 py-4">
      <h1 className="font-display font-bold text-3xl text-orange-500 text-center mb-4">The Kitchen 🧪</h1>

      <div className="flex flex-col lg:flex-row gap-3">
        {/* Left: Tools */}
        <div className="lg:w-40 flex-shrink-0">
          <div className="bg-white rounded-2xl p-3 kid-shadow">
            <h3 className="font-display font-bold text-sm text-gray-700 mb-2 text-center">Tools</h3>
            <div className="flex lg:flex-col gap-2 overflow-x-auto no-scrollbar">
              {TOOLS.map(t => {
                const Icon = t.icon;
                const active = selectedTool === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTool(t.id)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-body whitespace-nowrap transition-colors ${active ? 'bg-orange-400 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{t.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-3 kid-shadow mt-3">
            <h3 className="font-display font-bold text-sm text-gray-700 mb-2 text-center">Moulds</h3>
            <div className="grid grid-cols-3 lg:grid-cols-2 gap-2">
              {Object.entries(SHAPES).map(([key, s]) => {
                const active = selectedShape === key;
                const locked = s.locked && !hasAccess;
                return (
                  <button
                    key={key}
                    onClick={() => locked ? showLocked('Moulds require Full Kitchen Access!') : setSelectedShape(key)}
                    className={`relative aspect-square rounded-xl flex items-center justify-center transition-colors ${active && !locked ? 'bg-orange-400' : 'bg-gray-100 hover:bg-gray-200'}`}
                  >
                    <div className="w-8 h-8" style={{ clipPath: s.clipPath, background: active && !locked ? 'white' : '#9CA3AF' }} />
                    {locked && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-xl">
                        <Lock className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Center: Crayon Canvas with Drawing */}
        <div className="flex-1 flex flex-col items-center bg-white rounded-3xl p-4 kid-shadow min-h-[400px]">
          <div className="relative flex items-center justify-center flex-1 w-full" style={{ minHeight: 320 }}>
            {/* Pour stream animation */}
            <AnimatePresence>
              {pouring && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: '60%', opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-4 rounded-b-full z-20 pointer-events-none"
                  style={{ background: selectedColor }}
                />
              )}
            </AnimatePresence>

            {/* Crayon + Drawing Canvas */}
            <div
              className="relative"
              style={{ width: CANVAS_W, height: CANVAS_H, clipPath: shapeClip, WebkitClipPath: shapeClip }}
            >
              <div className="absolute inset-0">
                <CrayonShape colors={segments.map(s => s.color)} heights={segments.map(s => s.height)} shape={selectedShape} width={CANVAS_W} height={CANVAS_H} showOutline={false} />
              </div>
              <canvas
                ref={drawCanvasRef}
                width={CANVAS_W}
                height={CANVAS_H}
                onMouseDown={handleDrawStart}
                onMouseMove={handleDrawMove}
                onMouseUp={handleDrawEnd}
                onMouseLeave={handleDrawEnd}
                onTouchStart={handleDrawStart}
                onTouchMove={handleDrawMove}
                onTouchEnd={handleDrawEnd}
                className="absolute inset-0 w-full h-full touch-none"
                style={{ cursor: selectedTool === 'pour' ? 'pointer' : selectedTool === 'erase' ? 'cell' : 'crosshair' }}
              />
            </div>
          </div>

          <p className="text-xs text-gray-400 font-body text-center mt-2">
            {selectedTool === 'pour' ? 'Click the crayon to pour wax!' : selectedTool === 'erase' ? 'Drag to erase your drawing' : 'Draw freely on your crayon! ✏️'}
          </p>

          <div className="flex gap-2 mt-3 w-full">
            <button
              onClick={clearDrawing}
              className="flex items-center justify-center gap-1.5 bg-gray-200 hover:bg-gray-300 text-gray-600 font-semibold py-2.5 px-4 rounded-2xl transition-colors text-sm"
            >
              <Trash2 className="w-4 h-4" /> Clear
            </button>
            <button
              onClick={() => setShowSave(true)}
              disabled={segments.length === 0}
              className="flex-1 flex items-center justify-center gap-1.5 bg-green-500 hover:bg-green-600 disabled:opacity-40 text-white font-semibold py-2.5 rounded-2xl transition-colors"
            >
              <Save className="w-4 h-4" /> Save to Library
            </button>
          </div>
        </div>

        {/* Right: Colors */}
        <div className="lg:w-40 flex-shrink-0">
          <div className="bg-white rounded-2xl p-3 kid-shadow">
            <h3 className="font-display font-bold text-sm text-gray-700 mb-2 text-center">Colours</h3>
            <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-y-auto no-scrollbar max-h-[400px]">
              {FREE_COLORS.map(c => (
                <button
                  key={c.hex}
                  onClick={() => setSelectedColor(c.hex)}
                  title={c.name}
                  className={`flex-shrink-0 w-10 h-10 rounded-full border-4 transition-transform hover:scale-110 ${selectedColor === c.hex ? 'border-purple-500 scale-110' : 'border-white'}`}
                  style={{ background: c.hex }}
                />
              ))}

              <div className="lg:border-t lg:border-gray-200 lg:pt-2 lg:mt-1 hidden lg:block">
                <p className="text-xs text-gray-400 font-body text-center mb-1">Premium ✨</p>
              </div>

              {LOCKED_COLORS.map(c => {
                const locked = !hasAccess;
                return (
                  <button
                    key={c.hex}
                    onClick={() => locked ? showLocked('Get Full Kitchen Access to unlock 30 colours!') : setSelectedColor(c.hex)}
                    title={c.name}
                    className={`relative flex-shrink-0 w-10 h-10 rounded-full border-4 ${selectedColor === c.hex && !locked ? 'border-purple-500 scale-110' : 'border-white'} transition-transform hover:scale-110`}
                    style={{ background: c.hex }}
                  >
                    {locked && (
                      <span className="absolute inset-0 flex items-center justify-center">
                        <Lock className="w-3.5 h-3.5 text-red-500" />
                      </span>
                    )}
                  </button>
                );
              })}

              {/* Color picker */}
              <button
                onClick={() => hasAccess ? colorInputRef.current?.click() : showLocked('Colour picker requires Full Kitchen Access!')}
                className="relative flex-shrink-0 w-10 h-10 rounded-full border-4 border-white bg-gradient-to-br from-red-400 via-yellow-400 via-green-400 to-purple-500 flex items-center justify-center transition-transform hover:scale-110"
              >
                {!hasAccess && <Lock className="w-3.5 h-3.5 text-red-500" />}
                {hasAccess && <Brush className="w-4 h-4 text-white" />}
                <input
                  ref={colorInputRef}
                  type="color"
                  value={selectedColor}
                  onChange={e => setSelectedColor(e.target.value)}
                  className="absolute opacity-0 w-0 h-0"
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Locked message */}
      <AnimatePresence>
        {lockedMsg && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-purple-600 text-white px-5 py-3 rounded-2xl kid-shadow-lg z-50 font-body text-sm"
          >
            🔒 {lockedMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Save modal */}
      <AnimatePresence>
        {showSave && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowSave(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-3xl p-6 max-w-sm w-full kid-shadow-lg"
            >
              <h3 className="font-display font-bold text-xl text-gray-800 mb-3">Save Your Design! 🎨</h3>
              <input
                value={designName}
                onChange={e => setDesignName(e.target.value)}
                placeholder="Name your crayon..."
                className="w-full bg-gray-50 border-2 border-gray-200 rounded-2xl px-4 py-3 font-body text-sm focus:border-purple-400 outline-none mb-4"
              />
              <div className="flex gap-2">
                <button onClick={() => setShowSave(false)} className="flex-1 bg-gray-100 text-gray-600 font-semibold py-2.5 rounded-2xl">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold py-2.5 rounded-2xl disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save!'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}