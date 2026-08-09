import React, { useState, useEffect } from 'react';
import { Outlet, Link } from 'react-router-dom';
import DropdownMenu from './DropdownMenu';
import AdBar from './AdBar';
import { hasNoAds } from '@/lib/premium';
import { BookMarked, Home } from 'lucide-react';

export default function AppLayout() {
  const [noAds, setNoAds] = useState(hasNoAds());

  useEffect(() => {
    const handler = () => setNoAds(hasNoAds());
    window.addEventListener('cc-premium-change', handler);
    return () => window.removeEventListener('cc-premium-change', handler);
  }, []);

  return (
    <div className="min-h-screen flex flex-col rainbow-bg">
      <header className="no-print sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-purple-100 px-3 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DropdownMenu />
          <Link to="/home" className="flex items-center gap-1.5 text-purple-600 hover:text-purple-800 font-display font-bold text-lg">
            <Home className="w-5 h-5" />
            <span className="hidden sm:inline">Home</span>
          </Link>
        </div>
        <Link to="/library" className="flex items-center gap-1.5 bg-amber-400 hover:bg-amber-500 text-white font-semibold px-3 py-2 rounded-2xl kid-shadow transition-colors">
          <BookMarked className="w-5 h-5" />
          <span className="hidden sm:inline">Library</span>
        </Link>
      </header>

      <main className={`flex-1 ${noAds ? 'pb-4' : 'pb-20'}`}>
        <Outlet />
      </main>

      <AdBar />
    </div>
  );
}