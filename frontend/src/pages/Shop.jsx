import React, { useState, useEffect } from 'react';
import { hasFeature, setFeature, isTrialActive, hasTrialUsed, startTrial, getTrialDaysLeft } from '@/lib/premium';
import { motion } from 'framer-motion';
import { ShieldCheck, FlaskConical, Check, Sparkles, Clock, Calendar } from 'lucide-react';

export default function Shop() {
  const [state, setState] = useState({});

  const refresh = () => setState({
    no_ads: hasFeature('no_ads'),
    kitchen: hasFeature('kitchen'),
    colouring: hasFeature('colouring'),
    trialActive: isTrialActive(),
    trialUsed: hasTrialUsed(),
    trialDaysLeft: getTrialDaysLeft(),
  });

  useEffect(() => {
    refresh();
    const handler = () => refresh();
    window.addEventListener('cc-premium-change', handler);
    return () => window.removeEventListener('cc-premium-change', handler);
  }, []);

  const handleBuy = (id) => {
    setFeature(id, true);
    refresh();
  };

  const handleTrial = () => {
    startTrial();
    refresh();
  };

  const trialOwned = state.trialActive;
  const trialDays = state.trialDaysLeft;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="text-center mb-6">
        <h1 className="font-display font-bold text-3xl text-purple-700">The Shop 🛍️</h1>
        <p className="text-gray-500 font-body mt-1">One-time purchases. No repeating charges — ever!</p>
      </div>

      {trialOwned && (
        <div className="bg-gradient-to-r from-blue-100 to-cyan-100 border-2 border-blue-200 rounded-2xl p-4 mb-4 flex items-center gap-3">
          <Clock className="w-6 h-6 text-blue-600 flex-shrink-0" />
          <p className="text-sm text-blue-700 font-body">
            Your free trial is active! <b>{trialDays} day{trialDays !== 1 ? 's' : ''}</b> left of full Kitchen & Colouring access.
          </p>
        </div>
      )}

      <div className="space-y-4">
        {/* No Ads Pass — $15 */}
        <ProductCard
          icon={ShieldCheck} gradient="from-blue-400 to-indigo-500"
          title="No Ads Pass" price={15}
          desc="Remove all ads forever — no pop-ups, ever!"
          owned={state.no_ads} onBuy={() => handleBuy('no_ads')}
        />

        {/* Full Kitchen + Colouring — $10 */}
        <ProductCard
          icon={FlaskConical} gradient="from-orange-400 to-red-500"
          title="Full Kitchen + Colouring Access" price={10}
          desc="Unlock 30 extra colours, colour picker, all mould shapes & premium colouring sheets!"
          owned={state.kitchen && state.colouring} onBuy={() => { handleBuy('kitchen'); handleBuy('colouring'); }}
        />

        {/* Free Trial — $5 for 1 month, once */}
        {!trialOwned && (
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-3xl p-5 kid-shadow flex flex-col sm:flex-row sm:items-center gap-4 border-2 border-dashed border-green-300"
          >
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center flex-shrink-0">
              <Calendar className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-display font-bold text-lg text-gray-800">Free Trial Pass</h3>
              <p className="text-sm text-gray-500 font-body">Try full Kitchen & Colouring access for 1 month. Only available once!</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-display font-bold text-2xl text-green-600">$5.00</span>
              {state.trialUsed ? (
                <div className="bg-gray-100 text-gray-500 px-4 py-2.5 rounded-2xl font-semibold text-sm">
                  Already used
                </div>
              ) : (
                <button
                  onClick={handleTrial}
                  className="bg-green-500 hover:bg-green-600 text-white font-semibold px-5 py-2.5 rounded-2xl kid-shadow transition-colors"
                >
                  Start Trial
                </button>
              )}
            </div>
          </motion.div>
        )}
      </div>

      <div className="mt-6 bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-amber-700 font-body">
          All purchases are one-time only — no subscriptions, no repeating charges. Buy once, keep forever! 💜
        </p>
      </div>
    </div>
  );
}

function ProductCard({ icon: Icon, gradient, title, price, desc, owned, onBuy }) {
  return (
    <motion.div
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="bg-white rounded-3xl p-5 kid-shadow flex flex-col sm:flex-row sm:items-center gap-4"
    >
      <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0`}>
        <Icon className="w-8 h-8 text-white" />
      </div>
      <div className="flex-1">
        <h3 className="font-display font-bold text-lg text-gray-800">{title}</h3>
        <p className="text-sm text-gray-500 font-body">{desc}</p>
      </div>
      <div className="flex items-center gap-3">
        <span className="font-display font-bold text-2xl text-green-600">${price.toFixed(2)}</span>
        {owned ? (
          <div className="flex items-center gap-1 bg-green-100 text-green-700 px-4 py-2.5 rounded-2xl font-semibold">
            <Check className="w-5 h-5" /> Owned
          </div>
        ) : (
          <button
            onClick={onBuy}
            className="bg-purple-500 hover:bg-purple-600 text-white font-semibold px-5 py-2.5 rounded-2xl kid-shadow transition-colors"
          >
            Buy Now
          </button>
        )}
      </div>
    </motion.div>
  );
}