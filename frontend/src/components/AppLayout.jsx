import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import DropdownMenu from './DropdownMenu';
import { useAuth } from '@/lib/AuthContext';
import { BookMarked, Home, LogIn, LogOut } from 'lucide-react';

export default function AppLayout() {
  // `isLoadingAuth` matters here: without it the header flashes "Sign In" on
  // every load before the session resolves, which reads as being signed out.
  const { isAuthenticated, isLoadingAuth, logout } = useAuth();

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
        <div className="flex items-center gap-2">
          <Link to="/library" className="flex items-center gap-1.5 bg-amber-400 hover:bg-amber-500 text-white font-semibold px-3 py-2 rounded-2xl kid-shadow transition-colors">
            <BookMarked className="w-5 h-5" />
            <span className="hidden sm:inline">Library</span>
          </Link>
          {!isLoadingAuth && (isAuthenticated ? (
            <button
              type="button"
              onClick={() => logout()}
              className="flex items-center gap-1.5 bg-white hover:bg-purple-50 text-purple-600 font-semibold px-3 py-2 rounded-2xl kid-shadow border border-purple-100 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          ) : (
            <Link
              to="/login"
              className="flex items-center gap-1.5 bg-purple-500 hover:bg-purple-600 text-white font-semibold px-3 py-2 rounded-2xl kid-shadow transition-colors"
            >
              <LogIn className="w-5 h-5" />
              <span className="hidden sm:inline">Sign In</span>
            </Link>
          ))}
        </div>
      </header>

      <main className="flex-1 pb-4">
        <Outlet />
      </main>
    </div>
  );
}
