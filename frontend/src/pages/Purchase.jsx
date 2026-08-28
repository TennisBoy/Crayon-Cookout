import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Trophy, MapPin, Search, Star, Calendar, Sparkles, Minus, Plus, ShoppingCart } from 'lucide-react';
import { SETS, sizesOf, BULK_SAVING } from '@/lib/catalog';
import { getCart, addToCart, setQty } from '@/lib/cart';

const CONTEST_WINNER = {
  name: 'Galaxy Swirl',
  designer: 'Mia, age 9',
  colors: ['#A855F7', '#3B82F6', '#EC4899'],
  desc: 'A cosmic blend of purple, blue & pink — the winning design from our Spring Contest!',
};

const STORES = [
  { name: 'Walmart — Downtown', type: 'Walmart' },
  { name: 'Target — Westside', type: 'Target' },
  { name: 'Walmart — Uptown', type: 'Walmart' },
  { name: 'Target — Eastside', type: 'Target' },
];

const CURRENT_PROMPT = {
  month: 'July 2026',
  prompt: 'Under the Sea Adventure',
  desc: 'Make a crayon inspired by the ocean! Think fish, mermaids, treasure, coral, or anything from under the waves! 🌊',
};

const PREVIOUS_PROMPTS = [
  { month: 'June 2026', prompt: 'My Favourite Animal', desc: 'Turn your favourite animal into a crayon!' },
  { month: 'May 2026', prompt: 'Outer Space', desc: 'Stars, planets, rockets, and aliens!' },
  { month: 'April 2026', prompt: 'Dinosaur World', desc: 'T-Rex, Triceratops, or your own dino!' },
  { month: 'March 2026', prompt: 'Magic Garden', desc: 'Flowers, fairies, and magical plants!' },
  { month: 'February 2026', prompt: 'Sweet Treats', desc: 'Candy, cake, ice cream — anything yummy!' },
];

export default function Purchase() {
  const [tab, setTab] = useState('shop');
  const [showMap, setShowMap] = useState(false);
  const [cart, setCart] = useState(getCart);

  // The basket is also editable from /cart, so mirror it rather than owning it.
  useEffect(() => {
    const handler = () => setCart(getCart());
    window.addEventListener('cc-cart-change', handler);
    return () => window.removeEventListener('cc-cart-change', handler);
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <h1 className="font-display font-bold text-3xl text-blue-600 text-center">Purchase Crayons 🖍️</h1>

      {/* Tabs */}
      <div className="flex gap-2 justify-center">
        <button
          onClick={() => setTab('shop')}
          className={`px-5 py-2 rounded-2xl font-body font-semibold text-sm transition-colors ${tab === 'shop' ? 'bg-blue-500 text-white' : 'bg-white text-gray-500'}`}
        >
          Shop & Stores
        </button>
        <button
          onClick={() => setTab('contest')}
          className={`px-5 py-2 rounded-2xl font-body font-semibold text-sm transition-colors ${tab === 'contest' ? 'bg-blue-500 text-white' : 'bg-white text-gray-500'}`}
        >
          🏆 Contest
        </button>
      </div>

      {tab === 'shop' && (
        <>
          {/* Contest Winner */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-gradient-to-r from-amber-300 to-yellow-400 rounded-3xl p-5 kid-shadow-lg"
          >
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="w-6 h-6 text-amber-800" />
              <h2 className="font-display font-bold text-lg text-amber-900">Contest Winner!</h2>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="flex gap-1">
                {CONTEST_WINNER.colors.map((c, i) => (
                  <div key={i} className="w-8 h-16 rounded-lg" style={{ background: c }} />
                ))}
              </div>
              <div>
                <h3 className="font-display font-bold text-xl text-amber-900">{CONTEST_WINNER.name}</h3>
                <p className="text-sm text-amber-800 font-body">by {CONTEST_WINNER.designer}</p>
                <p className="text-sm text-amber-800 font-body mt-1">{CONTEST_WINNER.desc}</p>
                {/* No button here on purpose. The winning design is not a pack
                    you can buy — it is made and shipped to the child who drew
                    it — and a button that looked like the ones below but did
                    nothing read as broken rather than as unavailable. */}
              </div>
            </div>
          </motion.div>

          {/* Store Locator */}
          <div className="bg-white rounded-3xl p-5 kid-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-red-500" />
                <h2 className="font-display font-bold text-lg text-gray-800">Find a Store</h2>
              </div>
              <button
                onClick={() => setShowMap(!showMap)}
                className="flex items-center gap-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold px-3 py-2 rounded-full"
              >
                <Search className="w-4 h-4" /> {showMap ? 'Hide' : 'Search'}
              </button>
            </div>
            {showMap && (
              <div className="space-y-2">
                {STORES.map((s, i) => (
                  <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white ${s.type === 'Walmart' ? 'bg-blue-600' : 'bg-red-600'}`}>
                      {s.type[0]}
                    </div>
                    <div>
                      <p className="font-body font-semibold text-sm text-gray-700">{s.name}</p>
                      <p className="text-xs text-gray-400">Crayon Cookout crayons in stock!</p>
                    </div>
                  </div>
                ))}
                <p className="text-xs text-gray-400 text-center pt-2">📍 Find Crayon Cookout at Walmart & Target near you!</p>
              </div>
            )}
          </div>

          {/* Online Inventory */}
          <div>
            <h2 className="font-display font-bold text-xl text-gray-800 mb-3">Online Inventory</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {SETS.map((set, i) => (
                <SetCard key={set.slug} set={set} cart={cart} delay={i * 0.05} />
              ))}
            </div>
          </div>
        </>
      )}

      {tab === 'contest' && (
        <>
          {/* Contest Description */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-gradient-to-r from-purple-400 to-pink-400 rounded-3xl p-5 kid-shadow-lg"
          >
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-6 h-6 text-white" />
              <h2 className="font-display font-bold text-lg text-white">Crayon Design Competition!</h2>
            </div>
            <p className="text-white font-body text-sm sm:text-base">
              Join our Crayon Design Competition! Design a crayon based on this month's prompt, and the winner will have their crayon made and get a free copy of their crayon shipped to them!
            </p>
          </motion.div>

          {/* Current Prompt */}
          <div className="bg-white rounded-3xl p-5 kid-shadow border-2 border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-5 h-5 text-blue-500" />
              <span className="text-xs font-body font-semibold text-blue-500 bg-blue-50 px-3 py-1 rounded-full">THIS MONTH</span>
            </div>
            <h3 className="font-display font-bold text-2xl text-gray-800 mb-1">{CURRENT_PROMPT.month}</h3>
            <h4 className="font-display font-bold text-xl text-purple-600 mb-2">🎨 {CURRENT_PROMPT.prompt}</h4>
            <p className="text-sm text-gray-500 font-body">{CURRENT_PROMPT.desc}</p>
            <p className="text-xs text-gray-400 font-body mt-3">
              💡 Tip: Head to The Kitchen to design your crayon, then tap the ⭐ star in your Library to enter!
            </p>
          </div>

          {/* Previous Prompts */}
          <div>
            <h2 className="font-display font-bold text-xl text-gray-800 mb-3">📜 Previous Prompts</h2>
            <div className="space-y-2">
              {PREVIOUS_PROMPTS.map((p, i) => (
                <motion.div
                  key={i}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-white rounded-2xl p-4 kid-shadow flex items-center gap-3"
                >
                  <Star className="w-5 h-5 text-amber-400 flex-shrink-0" fill="currentColor" />
                  <div>
                    <span className="text-xs font-body text-gray-400">{p.month}</span>
                    <h3 className="font-display font-bold text-sm text-gray-700">{p.prompt}</h3>
                    <p className="text-xs text-gray-400 font-body">{p.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
/**
 * One design, sold in two sizes.
 *
 * The card is the whole set rather than one sellable id, because the 6 and the
 * 12 of a design are the same crayons — showing them as two separate tiles
 * would read as two products and bury the fact that the 12 is the better deal.
 */
function SetCard({ set, cart, delay }) {
  const sizes = sizesOf(set.slug);
  const inBasket = sizes.reduce((total, p) => total + (cart[p.id] || 0), 0);

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay }}
      className="bg-white rounded-2xl p-4 kid-shadow hover:scale-[1.03] transition-transform"
    >
      <div className="flex items-end justify-center gap-1 h-16 mb-2">
        {set.colors.map((c, j) => (
          <div key={j} className="w-3 rounded-t" style={{ background: c, height: '70%' }} />
        ))}
      </div>
      <h3 className="font-body font-semibold text-sm text-gray-700 text-center">
        {set.name} {set.emoji}
      </h3>

      <div className="mt-2">
        {sizes.map((p) => (
          <SizeRow key={p.id} product={p} qty={cart[p.id] || 0} />
        ))}
      </div>

      {/* Where "Add to Cart" used to be. There is nothing to add from here any
          more — the steppers do that — so the slot is a way OUT of the shop,
          and only once there is something to go and look at. The empty case
          keeps the height so the grid does not jump as packs are added. */}
      {inBasket > 0 ? (
        <Link
          to="/cart"
          className="w-full mt-3 h-9 bg-green-500 hover:bg-green-600 text-white text-xs font-semibold rounded-full flex items-center justify-center gap-1.5 transition-colors"
        >
          <ShoppingCart className="w-3.5 h-3.5" />
          Go to Cart
        </Link>
      ) : (
        <div className="mt-3 h-9" aria-hidden="true" />
      )}
    </motion.div>
  );
}

/** One buyable size: what you get, what it costs, and how many you want. */
function SizeRow({ product, qty }) {
  return (
    <div
      role="group"
      aria-label={`${product.name} quantity`}
      className="flex items-center justify-between gap-2 py-1.5 border-t border-gray-100"
    >
      <div className="min-w-0">
        <p className="font-body text-xs text-gray-500 leading-tight">{product.count} crayons</p>
        {product.count === 12 && (
          <p className="text-[10px] font-semibold text-amber-700">
            save {Math.round(BULK_SAVING * 100)}¢
          </p>
        )}
      </div>
      <span className="font-display font-bold text-sm text-green-600">
        ${product.price.toFixed(2)}
      </span>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={() => setQty(product.id, qty - 1)}
          disabled={!qty}
          aria-label={`Remove one ${product.name}`}
          className="w-7 h-7 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center hover:bg-gray-200 disabled:opacity-40 disabled:hover:bg-gray-100 transition-colors"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <span className="font-display font-bold text-sm text-gray-700 w-5 text-center">{qty}</span>
        <button
          onClick={() => addToCart(product.id)}
          aria-label={`Add one ${product.name}`}
          className="w-7 h-7 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center hover:bg-purple-200 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
