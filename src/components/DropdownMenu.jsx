import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu, ShoppingCart, FlaskConical, Palette, Store, ChevronDown } from 'lucide-react';

const MENU_ITEMS = [
  { label: 'Purchase Crayons', path: '/purchase', icon: Store, color: 'text-blue-500' },
  { label: 'The Kitchen', path: '/kitchen', icon: FlaskConical, color: 'text-orange-500' },
  { label: 'Colouring Sheet Lab', path: '/colouring-lab', icon: Palette, color: 'text-green-500' },
  { label: 'The Shop', path: '/shop', icon: ShoppingCart, color: 'text-purple-500' },
];

export default function DropdownMenu() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="relative z-50">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 bg-white hover:bg-purple-50 text-purple-700 font-body font-semibold px-3 py-2 sm:px-4 rounded-2xl kid-shadow border-2 border-purple-100 transition-all"
      >
        <Menu className="w-5 h-5" />
        <span className="hidden sm:inline">Menu</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-2xl kid-shadow-lg border-2 border-purple-100 overflow-hidden z-50">
            {MENU_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = location.pathname === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => { navigate(item.path); setOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left font-body hover:bg-purple-50 transition-colors border-b border-purple-50 last:border-0 ${active ? 'bg-purple-50 font-semibold' : ''}`}
                >
                  <Icon className={`w-5 h-5 ${item.color}`} />
                  <span className="text-sm text-gray-700">{item.label}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}