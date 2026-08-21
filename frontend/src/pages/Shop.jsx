import React, { useState, useEffect } from 'react';
import { hasFeature, isTrialActive, hasTrialUsed, startTrial, getTrialDaysLeft, refreshEntitlements } from '@/lib/premium';
import { startCheckout } from '@/lib/adapters/billing';
import ParentGate from '@/components/ParentGate';
import { motion } from 'framer-motion';
import { FlaskConical, Check, Sparkles, Clock, Calendar } from 'lucide-react';

export default function Shop() {
  const [state, setState] = useState({});
  const [gateOpen, setGateOpen] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const refresh = () => setState({
    kitchen: hasFeature('kitchen'),
    colouring: hasFeature('colouring'),
    trialActive: isTrialActive(),
    trialUsed: hasTrialUsed(),
    trialDaysLeft: getTrialDaysLeft(),
  });

  useEffect(() => {
    refresh();
    // Returning from a cancelled checkout, or arriving after paying: ask the
    // server rather than trusting whatever the cache last held.
    refreshEntitlements().catch(() => {});
    const handler = () => refresh();
    window.addEventListener('cc-premium-change', handler);
    return () => window.removeEventListener('cc-premium-change', handler);
  }, []);

  // Buying is a redirect to Stripe. Nothing is granted here: the entitlement
  // is written server-side by the webhook once payment is verified, which is
  // why a purchase cannot be faked from the browser any more.
  const handleBuy = () => {
    setError(null);
    setGateOpen(true);
  };

  const handleGatePass = () => {
    setGateOpen(false);
    setBusy(true);
    startCheckout().catch((err) => {
      setBusy(false);
      setError(err.message);
    });
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

      {error && (
        <div role="alert" className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 mb-4">
          <p className="text-sm text-red-600 font-body">{error}</p>
        </div>
      )}

      <div className="space-y-4">
        {/* Full Kitchen + Colouring — $10 */}
        <ProductCard
          icon={FlaskConical} gradient="from-orange-400 to-red-500"
          title="Full Kitchen + Colouring Access" price={10}
          desc="Unlock 30 extra colours, colour picker, all mould shapes & premium colouring sheets!"
          owned={state.kitchen && state.colouring} onBuy={handleBuy} busy={busy}
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

      {gateOpen && (
        <ParentGate onPass={handleGatePass} onCancel={() => setGateOpen(false)} />
      )}
    </div>
  );
}

function ProductCard({ icon: Icon, gradient, title, price, desc, owned, onBuy, busy }) {
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
            disabled={busy}
            className="bg-purple-500 hover:bg-purple-600 disabled:bg-purple-300 text-white font-semibold px-5 py-2.5 rounded-2xl kid-shadow transition-colors"
          >
            {busy ? 'Opening…' : 'Buy Now'}
          </button>
        )}
      </div>
    </motion.div>
  );
}