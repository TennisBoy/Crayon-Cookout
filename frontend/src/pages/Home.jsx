import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import CrayonLogo from '@/components/CrayonLogo';
import { Store, FlaskConical, Palette, ShoppingCart, BookMarked } from 'lucide-react';

const OPTIONS = [
  { label: 'Purchase Crayons', path: '/purchase', icon: Store, gradient: 'from-blue-400 to-cyan-400', desc: 'Find stores near you & shop online!' },
  { label: 'The Kitchen', path: '/kitchen', icon: FlaskConical, gradient: 'from-orange-400 to-red-400', desc: 'Design your own custom crayon!' },
  { label: 'Colouring Sheet Lab', path: '/colouring-lab', icon: Palette, gradient: 'from-green-400 to-emerald-400', desc: 'Make & colour your own sheets!' },
  { label: 'The Shop', path: '/shop', icon: ShoppingCart, gradient: 'from-purple-400 to-pink-400', desc: 'Unlock premium features!' },
];

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-8 sm:py-12">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="mb-6"
      >
        <CrayonLogo size={130} />
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-purple-500 font-body text-center mb-8 max-w-md"
      >
        Welcome, young artist! What would you like to do today? 🎨
      </motion.p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
        {OPTIONS.map((opt, i) => {
          const Icon = opt.icon;
          return (
            <motion.div
              key={opt.path}
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 + i * 0.1 }}
            >
              <Link
                to={opt.path}
                className="block bg-white rounded-3xl p-5 kid-shadow-lg hover:scale-[1.03] active:scale-[0.98] transition-transform"
              >
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${opt.gradient} flex items-center justify-center mb-3`}>
                  <Icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="font-display font-bold text-lg text-gray-800">{opt.label}</h3>
                <p className="text-sm text-gray-500 font-body mt-0.5">{opt.desc}</p>
              </Link>
            </motion.div>
          );
        })}
      </div>

      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.9 }}
        className="mt-6 w-full max-w-2xl"
      >
        <Link
          to="/library"
          className="block bg-gradient-to-r from-amber-300 to-yellow-400 rounded-3xl p-5 kid-shadow-lg hover:scale-[1.03] active:scale-[0.98] transition-transform"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/40 flex items-center justify-center">
              <BookMarked className="w-7 h-7 text-amber-800" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-amber-900">Your Library</h3>
              <p className="text-sm text-amber-800 font-body">Saved designs & collectible crayons!</p>
            </div>
          </div>
        </Link>
      </motion.div>
    </div>
  );
}