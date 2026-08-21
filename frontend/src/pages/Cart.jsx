import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Minus, Plus, Trash2, Store } from 'lucide-react';
import { getCart, setQty, addToCart } from '@/lib/cart';
import { findProduct } from '@/lib/catalog';

/**
 * The crayon packs you mean to buy.
 *
 * What you already *own* — the Kitchen + Colouring pass and the trial — is the
 * Shop's job: it badges an owned product and shows a running trial's days left.
 * Repeating that here would only create a second place for the two to disagree.
 */
export default function Cart() {
  const [cart, setCart] = useState(getCart);

  useEffect(() => {
    const handler = () => setCart(getCart());
    window.addEventListener('cc-cart-change', handler);
    return () => window.removeEventListener('cc-cart-change', handler);
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

          <div className="text-center mt-6">
            <p className="text-sm text-gray-500 font-body mb-3">Ask a grown-up before you buy! 💜</p>
            <Link
              to="/purchase"
              className="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold px-5 py-3 rounded-2xl kid-shadow transition-colors"
            >
              <Store className="w-5 h-5" />
              Add more packs
            </Link>
          </div>
        </>
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
