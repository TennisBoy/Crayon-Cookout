import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FlaskConical, Clock, Check, ShoppingCart } from 'lucide-react';
import {
  hasFeature,
  isTrialActive,
  hasTrialUsed,
  getTrialDaysLeft,
  refreshEntitlements,
} from '@/lib/premium';

/**
 * What you own.
 *
 * Reads the same state the Shop gates on, so the two pages can never disagree:
 * the Kitchen + Colouring pass comes from the server (cc_entitlements), the
 * trial is local and time-limited.
 */
export default function Cart() {
  const [state, setState] = useState({});

  const refresh = () => setState({
    kitchen: hasFeature('kitchen'),
    colouring: hasFeature('colouring'),
    trialActive: isTrialActive(),
    trialUsed: hasTrialUsed(),
    trialDaysLeft: getTrialDaysLeft(),
  });

  useEffect(() => {
    refresh();
    // Ask the server rather than trusting the cache alone: this page exists to
    // answer "did my purchase go through?", which is exactly when a stale
    // cache is most misleading.
    refreshEntitlements().catch(() => {});
    const handler = () => refresh();
    window.addEventListener('cc-premium-change', handler);
    return () => window.removeEventListener('cc-premium-change', handler);
  }, []);

  const fullAccess = state.kitchen && state.colouring;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="text-center mb-6">
        <h1 className="font-display font-bold text-3xl text-purple-700">Your Cart 🛒</h1>
        <p className="text-gray-500 font-body mt-1">Everything you have unlocked.</p>
      </div>

      <div className="space-y-4">
        <StatusCard
          icon={FlaskConical}
          gradient="from-orange-400 to-red-500"
          title="Full Kitchen + Colouring Access"
          desc="30 extra colours, colour picker, all mould shapes & premium colouring sheets."
          live={fullAccess}
          liveLabel="Active"
          idleLabel="Not unlocked yet"
          delay={0.1}
        />

        <StatusCard
          icon={Clock}
          gradient="from-green-400 to-emerald-500"
          title="Free Trial"
          desc={
            state.trialActive
              ? `${state.trialDaysLeft} day${state.trialDaysLeft !== 1 ? 's' : ''} of full access left.`
              : state.trialUsed
                ? 'Your trial has already been used.'
                : 'One month of full Kitchen & Colouring access.'
          }
          live={state.trialActive}
          liveLabel="Active"
          idleLabel={state.trialUsed ? 'Used' : 'Not started'}
          delay={0.2}
        />
      </div>

      {!fullAccess && (
        <div className="text-center mt-8">
          <p className="text-sm text-gray-500 font-body mb-3">
            Want the full set of colours and shapes?
          </p>
          <Link
            to="/shop"
            className="inline-flex items-center gap-2 bg-purple-500 hover:bg-purple-600 text-white font-semibold px-5 py-3 rounded-2xl kid-shadow transition-colors"
          >
            <ShoppingCart className="w-5 h-5" />
            Go to the Shop
          </Link>
        </div>
      )}
    </div>
  );
}

function StatusCard({ icon: Icon, gradient, title, desc, live, liveLabel, idleLabel, delay }) {
  return (
    <motion.div
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ delay }}
      className="bg-white rounded-3xl p-5 kid-shadow flex flex-col sm:flex-row sm:items-center gap-4"
    >
      <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0`}>
        <Icon className="w-8 h-8 text-white" />
      </div>
      <div className="flex-1">
        <h2 className="font-display font-bold text-lg text-gray-800">{title}</h2>
        <p className="text-sm text-gray-500 font-body">{desc}</p>
      </div>
      {live ? (
        <span className="inline-flex items-center gap-1.5 bg-green-100 text-green-700 font-semibold text-sm px-4 py-2 rounded-2xl">
          <Check className="w-4 h-4" />
          {liveLabel}
        </span>
      ) : (
        <span className="inline-flex items-center bg-gray-100 text-gray-500 font-semibold text-sm px-4 py-2 rounded-2xl">
          {idleLabel}
        </span>
      )}
    </motion.div>
  );
}
