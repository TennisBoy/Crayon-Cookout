import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Minus, Plus, Trash2, Store, FlaskConical, Clock, Check, PackageCheck } from 'lucide-react';
import { startPreorder } from '@/lib/adapters/billing';
import ParentGate from '@/components/ParentGate';
import { getCart, setQty, addToCart } from '@/lib/cart';
import { findProduct } from '@/lib/catalog';
import {
  hasFeature,
  isTrialActive,
  hasTrialUsed,
  getTrialDaysLeft,
  refreshEntitlements,
} from '@/lib/premium';

/**
 * Everything to do with buying: packs you mean to buy, and passes you already
 * own.
 *
 * An earlier version deliberately left ownership to the Shop, on the grounds
 * that showing it twice creates two places to disagree. That risk is real, and
 * the answer is not to hide it but to read the same state: both pages call
 * hasFeature(), which reads the server-backed entitlement cache. Neither holds
 * an opinion of its own, so they cannot drift.
 *
 * The passes are shown BELOW the basket. The basket is the part with unfinished
 * business in it.
 */
export default function Cart() {
  const [cart, setCart] = useState(getCart);
  const [owned, setOwned] = useState(readOwned);
  const [gateOpen, setGateOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const handler = () => setCart(getCart());
    window.addEventListener('cc-cart-change', handler);
    return () => window.removeEventListener('cc-cart-change', handler);
  }, []);

  useEffect(() => {
    // This is the page someone opens straight after paying, which is exactly
    // when a stale cache is most misleading. Ask the server.
    refreshEntitlements().catch(() => {});
    const handler = () => setOwned(readOwned());
    window.addEventListener('cc-premium-change', handler);
    return () => window.removeEventListener('cc-premium-change', handler);
  }, []);

  // A basket saved before a pack was withdrawn still holds that pack's id.
  // Skip those lines rather than rendering a blank row for them.
  const lines = Object.entries(cart)
    .map(([id, qty]) => ({ product: findProduct(id), qty }))
    .filter((line) => line.product);

  const subtotal = lines.reduce((sum, l) => sum + l.product.price * l.qty, 0);
  const count = lines.reduce((total, l) => total + l.qty, 0);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="text-center mb-6">
        <h1 className="font-display font-bold text-3xl text-purple-700">Your Cart 🛒</h1>
        <p className="text-gray-500 font-body mt-1">
          {count > 0
            ? `${count} pack${count !== 1 ? 's' : ''} ready to go.`
            : 'The crayon packs you want to buy.'}
        </p>
      </div>

      {lines.length === 0 ? (
        <EmptyCart />
      ) : (
        <>
          <div className="space-y-3">
            {lines.map(({ product, qty }, i) => (
              <CartLine key={product.id} product={product} qty={qty} delay={i * 0.05} />
            ))}
          </div>

          <div className="mt-6 bg-white rounded-3xl p-5 kid-shadow flex items-center justify-between">
            <span className="font-display font-bold text-lg text-gray-800">Subtotal</span>
            <span className="font-display font-bold text-2xl text-green-600">${subtotal.toFixed(2)}</span>
          </div>

          {error && (
            <div role="alert" className="mt-4 bg-red-50 border-2 border-red-200 rounded-2xl p-4">
              <p className="text-sm text-red-600 font-body">{error}</p>
            </div>
          )}

          <div className="mt-6 bg-blue-50 border-2 border-blue-200 rounded-2xl p-4">
            {/* Saying this BEFORE the card is asked for is the whole basis on
                which keeping a card on file is fair. */}
            <p className="text-sm text-blue-800 font-body">
              <b>You won't be charged today.</b> We'll take{' '}
              <b>${subtotal.toFixed(2)}</b> when your crayons ship, on or before{' '}
              <b>8 September</b>. Cancel any time before then.
            </p>
          </div>

          <div className="text-center mt-6">
            <p className="text-sm text-gray-500 font-body mb-3">Ask a grown-up before you pre-order! 💜</p>
            <button
              type="button"
              onClick={() => { setError(null); setGateOpen(true); }}
              disabled={busy}
              className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white font-semibold px-6 py-3 rounded-2xl kid-shadow transition-colors"
            >
              <PackageCheck className="w-5 h-5" />
              {busy ? 'Opening…' : 'Pre-order these packs'}
            </button>
            <div className="mt-3">
              <Link to="/purchase" className="inline-flex items-center gap-1.5 text-sm text-blue-600 font-body hover:underline">
                <Store className="w-4 h-4" />
                Add more packs
              </Link>
            </div>
          </div>
        </>
      )}

      <Passes owned={owned} />

      {gateOpen && (
        <ParentGate
          onPass={() => {
            setGateOpen(false);
            setBusy(true);
            startPreorder(cart).catch((err) => {
              setBusy(false);
              setError(err.message);
            });
          }}
          onCancel={() => setGateOpen(false)}
        />
      )}
    </div>
  );
}

/** Reads through premium.js, so the Shop and this page cannot disagree. */
function readOwned() {
  return {
    pass: hasFeature('kitchen') && hasFeature('colouring'),
    trialActive: isTrialActive(),
    trialUsed: hasTrialUsed(),
    trialDaysLeft: getTrialDaysLeft(),
  };
}

function Passes({ owned }) {
  return (
    <section className="mt-10">
      <h2 className="font-display font-bold text-xl text-gray-800 mb-3">Your passes 🔑</h2>
      <div className="space-y-3">
        <PassRow
          icon={FlaskConical}
          gradient="from-orange-400 to-red-500"
          title="Full Kitchen + Colouring Access"
          // The pass grants two features and is sold as one product: owning
          // half of it is not a completed purchase.
          live={owned.pass}
          liveLabel="Active"
          idleLabel="Not unlocked yet"
        />
        <PassRow
          icon={Clock}
          gradient="from-green-400 to-emerald-500"
          title="Free Trial"
          desc={
            owned.trialActive
              ? `${owned.trialDaysLeft} day${owned.trialDaysLeft !== 1 ? 's' : ''} left.`
              : undefined
          }
          live={owned.trialActive}
          liveLabel="Active"
          idleLabel={owned.trialUsed ? 'Used' : 'Not started'}
        />
      </div>
      {!owned.pass && (
        <div className="text-center mt-4">
          <Link to="/shop" className="text-sm text-purple-600 font-body hover:underline">
            See what the Shop unlocks →
          </Link>
        </div>
      )}
    </section>
  );
}

function PassRow({ icon: Icon, gradient, title, desc, live, liveLabel, idleLabel }) {
  return (
    <div className="bg-white rounded-3xl p-4 kid-shadow flex items-center gap-4">
      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div className="flex-1">
        <h3 className="font-display font-bold text-base text-gray-800">{title}</h3>
        {desc && <p className="text-sm text-gray-500 font-body">{desc}</p>}
      </div>
      {live ? (
        <span className="inline-flex items-center gap-1.5 bg-green-100 text-green-700 font-semibold text-sm px-3 py-1.5 rounded-2xl">
          <Check className="w-4 h-4" />
          {liveLabel}
        </span>
      ) : (
        <span className="inline-flex items-center bg-gray-100 text-gray-500 font-semibold text-sm px-3 py-1.5 rounded-2xl">
          {idleLabel}
        </span>
      )}
    </div>
  );
}

function EmptyCart() {
  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="bg-white rounded-3xl p-8 kid-shadow text-center"
    >
      <div className="text-5xl mb-3">🖍️</div>
      <h2 className="font-display font-bold text-xl text-gray-800">No packs in your cart yet!</h2>
      <p className="text-sm text-gray-500 font-body mt-1 mb-5">
        Head to the shop and pick some crayons you love.
      </p>
      <Link
        to="/purchase"
        className="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold px-5 py-3 rounded-2xl kid-shadow transition-colors"
      >
        <Store className="w-5 h-5" />
        Browse crayon packs
      </Link>
    </motion.div>
  );
}

function CartLine({ product, qty, delay }) {
  return (
    <motion.div
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ delay }}
      className="bg-white rounded-3xl p-4 kid-shadow flex flex-col sm:flex-row sm:items-center gap-4"
    >
      <div className="flex items-end justify-center gap-1 h-14 w-20 flex-shrink-0">
        {product.colors.map((c, j) => (
          <div key={j} className="w-2.5 rounded-t" style={{ background: c, height: '70%' }} />
        ))}
      </div>

      <div className="flex-1 text-center sm:text-left">
        <h2 className="font-display font-bold text-lg text-gray-800">{product.name}</h2>
        <p className="text-sm text-gray-500 font-body">${product.price.toFixed(2)} each</p>
      </div>

      <div role="group" aria-label={`${product.name} quantity`} className="flex items-center justify-center gap-3">
        <button
          onClick={() => setQty(product.id, qty - 1)}
          aria-label={`Remove one ${product.name}`}
          className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center hover:bg-gray-200 transition-colors"
        >
          <Minus className="w-4 h-4" />
        </button>
        <span className="font-display font-bold text-lg text-gray-700 w-6 text-center">{qty}</span>
        <button
          onClick={() => addToCart(product.id)}
          aria-label={`Add one ${product.name}`}
          className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center hover:bg-purple-200 transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center justify-between sm:justify-end gap-3 sm:w-28">
        <span className="font-display font-bold text-xl text-green-600">
          ${(product.price * qty).toFixed(2)}
        </span>
        <button
          onClick={() => setQty(product.id, 0)}
          aria-label={`Remove ${product.name} from cart`}
          className="text-gray-300 hover:text-red-500 transition-colors"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>
    </motion.div>
  );
}
