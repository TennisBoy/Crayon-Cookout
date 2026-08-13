import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { list as listDesigns, update as updateDesign, remove as removeDesign } from '@/lib/adapters/designs';
import {
  list as listCollected,
  verify as verifyCollectible,
  readCache as readCollectedCache,
} from '@/lib/adapters/collectibles';
import CrayonShape from '@/components/CrayonShape';
import Silhouette from '@/components/Silhouettes';
import { Star, Camera, Trophy, Loader2, Check, Trash2 } from 'lucide-react';

const COLLECTIBLE_SETS = [
  {
    name: 'Nature Set', emoji: '🌿',
    crayons: [
      { name: 'Butterfly', type: 'butterfly', colors: ['#A855F7'] },
      { name: 'Flower', type: 'flower', colors: ['#EC4899', '#FACC15'] },
      { name: 'Tree', type: 'tree', colors: ['#22C55E', '#92400E'] },
      { name: 'Mushroom', type: 'mushroom', colors: ['#EF4444', '#FFFFFF'] },
      { name: 'Leaf', type: 'leaf', colors: ['#22C55E'] },
      { name: 'Acorn', type: 'acorn', colors: ['#92400E', '#A16207'] },
      { name: 'Bee', type: 'bee', colors: ['#FACC15', '#1F2937'] },
      { name: 'Ladybug', type: 'ladybug', colors: ['#EF4444', '#1F2937'] },
    ],
  },
  {
    name: 'Animals Set', emoji: '🦁',
    crayons: [
      { name: 'Lion', type: 'lion', colors: ['#F97316', '#FACC15'] },
      { name: 'Elephant', type: 'elephant', colors: ['#9CA3AF', '#D1D5DB'] },
      { name: 'Giraffe', type: 'giraffe', colors: ['#FACC15', '#A16207'] },
      { name: 'Turtle', type: 'turtle', colors: ['#22C55E'] },
      { name: 'Dolphin', type: 'dolphin', colors: ['#3B82F6'] },
      { name: 'Penguin', type: 'penguin', colors: ['#1F2937', '#FFFFFF'] },
      { name: 'Fox', type: 'fox', colors: ['#EF4444', '#F97316'] },
      { name: 'Owl', type: 'owl', colors: ['#92400E', '#A16207'] },
    ],
  },
  {
    name: 'Weather Set', emoji: '🌤️',
    crayons: [
      { name: 'Sun', type: 'sun', colors: ['#FACC15'] },
      { name: 'Cloud', type: 'cloud', colors: ['#FFFFFF', '#3B82F6'] },
      { name: 'Rainbow', type: 'rainbow', colors: ['#EF4444'] },
      { name: 'Lightning', type: 'lightning', colors: ['#FACC15'] },
      { name: 'Snowflake', type: 'snowflake', colors: ['#FFFFFF', '#38BDF8'] },
      { name: 'Raindrop', type: 'raindrop', colors: ['#3B82F6', '#60A5FA'] },
    ],
  },
  {
    name: 'Food Set', emoji: '🍕',
    crayons: [
      { name: 'Pizza Slice', type: 'pizza', colors: ['#F97316', '#FACC15'] },
      { name: 'Ice Cream', type: 'icecream', colors: ['#EC4899', '#D4A373'] },
      { name: 'Hamburger', type: 'hamburger', colors: ['#92400E', '#D4A373'] },
      { name: 'Taco', type: 'taco', colors: ['#D4A373', '#FFFFFF'] },
      { name: 'Donut', type: 'donut', colors: ['#EC4899', '#D4A373'] },
      { name: 'Watermelon', type: 'watermelon', colors: ['#EF4444', '#22C55E'] },
      { name: 'Strawberry', type: 'strawberry', colors: ['#EF4444'] },
    ],
  },
  {
    name: 'Sports Set', emoji: '⚽',
    crayons: [
      { name: 'Soccer Ball', type: 'soccerball', colors: ['#FFFFFF', '#1F2937'] },
      { name: 'Basketball', type: 'basketball', colors: ['#F97316'] },
      { name: 'Hockey Stick', type: 'hockeystick', colors: ['#1F2937'] },
      { name: 'Football', type: 'football', colors: ['#92400E'] },
      { name: 'Trophy', type: 'trophy', colors: ['#FACC15', '#EAB308'] },
    ],
  },
  {
    name: 'Around the World Set', emoji: '🌍',
    crayons: [
      { name: 'Eiffel Tower', type: 'eiffeltower', colors: ['#9CA3AF'] },
      { name: 'Maple Leaf', type: 'mapleleaf', colors: ['#3B82F6'] },
      { name: 'Statue of Liberty', type: 'liberty', colors: ['#22C55E', '#9CA3AF'] },
      { name: 'Big Ben', type: 'bigben', colors: ['#9CA3AF', '#FACC15'] },
      { name: 'Pyramid', type: 'pyramid', colors: ['#D4A373', '#FACC15'] },
      { name: 'Globe', type: 'globe', colors: ['#22C55E', '#3B82F6'] },
    ],
  },
  {
    name: 'School Set', emoji: '🎒',
    crayons: [
      { name: 'Pencil', type: 'pencil', colors: ['#FACC15', '#EF4444'] },
      { name: 'Ruler', type: 'ruler', colors: ['#FACC15', '#9CA3AF'] },
      { name: 'Apple', type: 'apple', colors: ['#EF4444'] },
      { name: 'Book', type: 'book', colors: ['#3B82F6'] },
      { name: 'Graduation Cap', type: 'gradcap', colors: ['#1F2937', '#FACC15'] },
      { name: 'Calculator', type: 'calculator', colors: ['#9CA3AF', '#1F2937'] },
      { name: 'Globe', type: 'globe', colors: ['#22C55E', '#3B82F6'] },
      { name: 'School Bus', type: 'schoolbus', colors: ['#FACC15', '#1F2937'] },
    ],
  },
  {
    name: 'Fantasy Set', emoji: '🐉',
    crayons: [
      { name: 'Dragon', type: 'dragon', colors: ['#22C55E', '#EF4444'] },
      { name: 'Unicorn', type: 'unicorn', colors: ['#EC4899', '#FFFFFF'] },
      { name: 'Castle', type: 'castle', colors: ['#FACC15', '#D4A373'] },
      { name: 'Sword', type: 'sword', colors: ['#9CA3AF', '#92400E'] },
      { name: 'Crown', type: 'crown', colors: ['#FACC15', '#EF4444'] },
      { name: 'Wizard Hat', type: 'wizardhat', colors: ['#3B82F6', '#FACC15'] },
      { name: 'Fairy', type: 'fairy', colors: ['#EC4899', '#FFFFFF'] },
    ],
  },
  {
    name: 'Transportation Set', emoji: '🚗',
    crayons: [
      { name: 'Race Car', type: 'racecar', colors: ['#EF4444', '#1F2937'] },
      { name: 'Fire Truck', type: 'firetruck', colors: ['#EF4444', '#1F2937'] },
      { name: 'Airplane', type: 'airplane', colors: ['#FFFFFF'] },
      { name: 'Train', type: 'train', colors: ['#22C55E', '#1F2937'] },
      { name: 'Sailboat', type: 'sailboat', colors: ['#9CA3AF'] },
    ],
  },
];

// The cached copy, for an instant first paint. The server is the source of
// truth; CollectiblesTab refreshes from it on mount.
const getCollected = readCollectedCache;

export default function Library() {
  const [tab, setTab] = useState('designs');
  const [designs, setDesigns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listDesigns('-created_date', 50)
      .then(data => { setDesigns(data || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <h1 className="font-display font-bold text-3xl text-purple-600 text-center mb-4">Your Library 📚</h1>

      <div className="flex gap-2 mb-5 justify-center">
        <button
          onClick={() => setTab('designs')}
          className={`px-5 py-2 rounded-2xl font-body font-semibold text-sm transition-colors ${tab === 'designs' ? 'bg-purple-500 text-white' : 'bg-white text-gray-500'}`}
        >
          My Designs
        </button>
        <button
          onClick={() => setTab('collectibles')}
          className={`px-5 py-2 rounded-2xl font-body font-semibold text-sm transition-colors ${tab === 'collectibles' ? 'bg-purple-500 text-white' : 'bg-white text-gray-500'}`}
        >
          Collectibles
        </button>
      </div>

      {tab === 'designs' && <DesignsTab designs={designs} loading={loading} onDeleted={() => {
        listDesigns('-created_date', 50)
          .then(data => setDesigns(data || []));
      }} />}
      {tab === 'collectibles' && <CollectiblesTab />}
    </div>
  );
}

function DesignsTab({ designs, loading, onDeleted }) {
  const [compEntry, setCompEntry] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await removeDesign(deleteTarget.id);
    } catch (e) { /* ignore */ }
    setDeleting(false);
    setDeleteTarget(null);
    onDeleted?.();
  };

  if (loading) {
    return <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-purple-300" /></div>;
  }

  if (designs.length === 0) {
    return (
      <div className="text-center py-10 bg-white rounded-3xl kid-shadow">
        <p className="text-gray-400 font-body">No saved designs yet! Head to The Kitchen to make one. 🎨</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {designs.map(d => (
          <motion.div
            key={d.id}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl p-3 kid-shadow relative"
          >
            <div className="flex justify-center mb-2">
              <CrayonShape colors={d.colors || []} heights={d.heights || []} shape={d.shape || 'crayon'} width={80} height={100} />
            </div>
            <p className="font-body font-semibold text-xs text-gray-700 text-center truncate">{d.name}</p>
            <div className="absolute top-2 right-2 flex flex-col gap-1.5">
              <button
                onClick={() => setCompEntry(d)}
                className={`p-1.5 rounded-full transition-colors ${d.is_competition_entry ? 'bg-amber-400 text-white' : 'bg-gray-100 text-amber-400 hover:bg-amber-100'}`}
              >
                <Star className="w-4 h-4" fill={d.is_competition_entry ? 'currentColor' : 'none'} />
              </button>
              <button
                onClick={() => setDeleteTarget(d)}
                className="p-1.5 rounded-full bg-gray-100 text-red-400 hover:bg-red-100 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {compEntry && <CompetitionModal design={compEntry} onClose={() => setCompEntry(null)} />}
      </AnimatePresence>

      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => !deleting && setDeleteTarget(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-3xl p-6 max-w-sm w-full text-center kid-shadow-lg"
            >
              <Trash2 className="w-12 h-12 text-red-400 mx-auto mb-3" />
              <h3 className="font-display font-bold text-xl text-gray-800 mb-1">Delete this design?</h3>
              <p className="text-sm text-gray-500 font-body mb-5">"{deleteTarget.name}" will be gone forever!</p>
              <div className="flex gap-2">
                <button onClick={() => setDeleteTarget(null)} disabled={deleting} className="flex-1 bg-gray-100 text-gray-600 font-semibold py-2.5 rounded-2xl">Cancel</button>
                <button onClick={handleDelete} disabled={deleting} className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-2xl">
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function CompetitionModal({ design, onClose }) {
  const [step, setStep] = useState('math');
  const [mathQ, setMathQ] = useState(() => generateMath());
  const [mathAnswer, setMathAnswer] = useState('');
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);

  function generateMath() {
    const ops = ['+', '-', '*'];
    const a = Math.floor(Math.random() * 8) + 2;
    const b = Math.floor(Math.random() * 8) + 2;
    const c = Math.floor(Math.random() * 6) + 2;
    const op1 = ops[Math.floor(Math.random() * 3)];
    const op2 = ops[Math.floor(Math.random() * 3)];
    const compute = (x, op, y) => op === '+' ? x + y : op === '-' ? x - y : x * y;
    const intermediate = compute(a, op1, b);
    const answer = compute(intermediate, op2, c);
    const sym = (op) => op === '*' ? '×' : op;
    return { expr: `${a} ${sym(op1)} ${b} ${sym(op2)} ${c}`, answer };
  }

  const checkMath = () => {
    if (parseInt(mathAnswer) === mathQ.answer) {
      setStep('details');
    } else {
      alert('Not quite! Try again. 🤔');
      setMathQ(generateMath());
      setMathAnswer('');
    }
  };

  const submit = async () => {
    try {
      await updateDesign(design.id, {
        is_competition_entry: true,
        competition_email: email,
      });
      setDone(true);
    } catch (e) {
      alert('Could not enter competition. Please try again.');
    }
  };

  if (done) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
          onClick={e => e.stopPropagation()} className="bg-white rounded-3xl p-6 max-w-sm w-full text-center kid-shadow-lg">
          <Trophy className="w-12 h-12 text-amber-400 mx-auto mb-3" />
          <h3 className="font-display font-bold text-xl text-gray-800 mb-1">You're Entered! 🎉</h3>
          <p className="text-sm text-gray-500 font-body mb-4">Good luck in the competition! We'll email you if you win.</p>
          <button onClick={onClose} className="bg-purple-500 hover:bg-purple-600 text-white font-semibold px-6 py-2.5 rounded-2xl">Awesome!</button>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
        onClick={e => e.stopPropagation()} className="bg-white rounded-3xl p-6 max-w-sm w-full kid-shadow-lg">
        {step === 'math' && (
          <>
            <h3 className="font-display font-bold text-xl text-gray-800 mb-1">Quick Math Check! 🧮</h3>
            <p className="text-sm text-gray-500 font-body mb-4">Solve this to enter the competition (adults only!):</p>
            <div className="bg-purple-50 rounded-2xl p-4 text-center mb-4">
              <span className="font-display font-bold text-3xl text-purple-700">{mathQ.expr} = ?</span>
            </div>
            <input
              type="number"
              value={mathAnswer}
              onChange={e => setMathAnswer(e.target.value)}
              placeholder="Your answer"
              className="w-full bg-gray-50 border-2 border-gray-200 rounded-2xl px-4 py-3 font-body text-sm focus:border-purple-400 outline-none mb-4 text-center"
            />
            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 bg-gray-100 text-gray-600 font-semibold py-2.5 rounded-2xl">Cancel</button>
              <button onClick={checkMath} className="flex-1 bg-purple-500 hover:bg-purple-600 text-white font-semibold py-2.5 rounded-2xl">Check</button>
            </div>
          </>
        )}
        {step === 'details' && (
          <>
            <h3 className="font-display font-bold text-xl text-gray-800 mb-1">Enter Competition! 🏆</h3>
            <div className="flex justify-center my-3">
              <CrayonShape colors={design.colors || []} heights={design.heights || []} shape={design.shape || 'crayon'} width={70} height={90} />
            </div>
            <p className="text-sm text-gray-500 font-body mb-3">Entering: <b>{design.name}</b></p>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Email to contact if you win"
              className="w-full bg-gray-50 border-2 border-gray-200 rounded-2xl px-4 py-3 font-body text-sm focus:border-purple-400 outline-none mb-3"
            />
            <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-3 mb-3 text-center">
              <p className="font-display font-bold text-2xl text-green-600">$15.00</p>
              <p className="text-xs text-amber-700 font-body">One-time entry fee</p>
            </div>
            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 bg-gray-100 text-gray-600 font-semibold py-2.5 rounded-2xl">Cancel</button>
              <button onClick={submit} disabled={!email} className="flex-1 bg-purple-500 hover:bg-purple-600 disabled:opacity-40 text-white font-semibold py-2.5 rounded-2xl">Pay & Enter</button>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

function CollectiblesTab() {
  const [collected, setCollectedState] = useState(getCollected());
  const [scanning, setScanning] = useState(null);
  const [scanTarget, setScanTarget] = useState(null);
  const [scanResult, setScanResult] = useState(null);
  const fileRef = React.useRef(null);

  useEffect(() => {
    const handler = () => setCollectedState(getCollected());
    window.addEventListener('cc-collected-change', handler);
    // Refresh from the server so a collection follows the user to a new
    // device. listCollected falls back to the cache if the API is unreachable.
    listCollected().then(setCollectedState).catch(() => {});
    return () => window.removeEventListener('cc-collected-change', handler);
  }, []);

  const startScan = (setName, crayon) => {
    setScanTarget({ setName, crayon });
    fileRef.current?.click();
  };

  const handlePhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !scanTarget) return;
    const { setName, crayon } = scanTarget;
    setScanning(crayon.name);
    try {
      // Verification and unlocking are one server call: a client that could
      // record an unlock without passing the photo check would make the
      // check optional.
      const { matched, key } = await verifyCollectible(file, {
        setName,
        crayonName: crayon.name,
        type: crayon.type,
        color: crayon.colors[0],
      });
      if (matched) {
        setCollectedState((prev) => [...new Set([...prev, key])]);
        setScanResult({ success: true, name: crayon.name });
      } else {
        setScanResult({ success: false, name: crayon.name });
      }
    } catch (err) {
      setScanResult({ success: false, name: crayon.name });
    }
    setScanning(null);
    setScanTarget(null);
    setTimeout(() => setScanResult(null), 3000);
    e.target.value = '';
  };

  return (
    <div className="space-y-4">
      <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handlePhoto} className="hidden" />

      {COLLECTIBLE_SETS.map(set => {
        const setCollectedCount = set.crayons.filter(c => collected.includes(`${set.name}/${c.name}`)).length;
        return (
          <div key={set.name} className="bg-gradient-to-b from-orange-50 to-amber-50 rounded-3xl p-4 kid-shadow">
            <div className="flex items-center justify-between mb-1 px-1">
              <h3 className="font-display font-bold text-lg text-gray-800">{set.emoji} {set.name}</h3>
              <span className="text-sm font-body text-purple-500 bg-white px-3 py-1 rounded-full kid-shadow">{setCollectedCount}/{set.crayons.length}</span>
            </div>

            {/* Shelf with crayons */}
            <div className="relative pt-3">
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-1 px-1 items-end">
                {set.crayons.map(crayon => {
                  const isCollected = collected.includes(`${set.name}/${crayon.name}`);
                  const isScanning = scanning === crayon.name;
                  return (
                    <div key={crayon.name} className="flex flex-col items-center">
                      <button
                        onClick={() => isCollected ? null : startScan(set.name, crayon)}
                        className="relative group"
                      >
                        <div className={`transition-all ${isCollected ? '' : 'grayscale'}`}>
                          <Silhouette
                            type={crayon.type}
                            colors={crayon.colors}
                            greyed={!isCollected}
                            size={56}
                          />
                        </div>
                        {!isCollected && (
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="bg-purple-500/80 rounded-full p-1.5">
                              <Camera className="w-4 h-4 text-white" />
                            </div>
                          </div>
                        )}
                        {isCollected && (
                          <div className="absolute -top-1 -right-1 bg-green-500 rounded-full p-0.5 shadow">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </button>
                      <p className={`text-[10px] font-body text-center mt-0.5 leading-tight ${isCollected ? 'text-gray-700' : 'text-gray-400'}`}>{crayon.name}</p>
                      {isScanning && <Loader2 className="w-3 h-3 animate-spin text-purple-400 mt-0.5" />}
                    </div>
                  );
                })}
              </div>
              {/* Wooden shelf plank */}
              <div className="h-3 bg-gradient-to-b from-amber-600 to-amber-800 rounded-t-sm shadow-md" />
              <div className="h-1.5 bg-amber-950 rounded-b-sm" />
            </div>
          </div>
        );
      })}

      <AnimatePresence>
        {scanResult && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className={`fixed bottom-24 left-1/2 -translate-x-1/2 px-5 py-3 rounded-2xl kid-shadow-lg z-50 font-body text-sm ${scanResult.success ? 'bg-green-500 text-white' : 'bg-red-400 text-white'}`}
          >
            {scanResult.success ? `🎉 Collected ${scanResult.name}!` : `❌ That doesn't match ${scanResult.name}. Try again!`}
          </motion.div>
        )}
      </AnimatePresence>

      <p className="text-xs text-gray-400 font-body text-center pt-2">
        📸 Tap a grey crayon and snap a photo of the real crayon to add it to your collection!
      </p>
    </div>
  );
}