import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, X } from 'lucide-react';

/**
 * An adult check in front of a purchase.
 *
 * This is not security -- the real protection is that paying requires a card.
 * It is there so a child cannot wander into a checkout page by tapping a
 * colourful button, which is the ordinary standard for apps aimed at children.
 *
 * The sum is generated once per mount so mashing "Continue" cannot brute-force
 * it, and uses two-digit multiplication, which is past what the audience for
 * this app can do but trivial for an adult.
 */
function makeQuestion() {
  const a = 3 + Math.floor(Math.random() * 9); // 3..11
  const b = 12 + Math.floor(Math.random() * 8); // 12..19
  return { a, b, answer: a * b };
}

export default function ParentGate({ onPass, onCancel }) {
  const [question] = useState(makeQuestion);
  const [value, setValue] = useState('');
  const [wrong, setWrong] = useState(false);

  const submit = (e) => {
    e.preventDefault();
    if (Number(value) === question.answer) {
      onPass();
    } else {
      setWrong(true);
      setValue('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-3xl kid-shadow-lg p-6 w-full max-w-sm relative"
        role="dialog"
        aria-modal="true"
        aria-label="Grown-up check"
      >
        <button
          type="button"
          onClick={onCancel}
          aria-label="Cancel"
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-5">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-purple-100 mb-3">
            <ShieldCheck className="w-7 h-7 text-purple-600" />
          </div>
          <h2 className="font-display font-bold text-xl text-gray-800">Grown-ups only</h2>
          <p className="text-sm text-gray-500 font-body mt-1">
            Ask a grown-up to answer this before buying.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <label htmlFor="parent-gate-answer" className="block text-center font-display font-bold text-2xl text-gray-800">
            {question.a} × {question.b} = ?
          </label>
          <input
            id="parent-gate-answer"
            type="number"
            inputMode="numeric"
            autoFocus
            value={value}
            onChange={(e) => { setValue(e.target.value); setWrong(false); }}
            className="w-full text-center text-xl font-body border-2 border-purple-100 rounded-2xl px-4 py-3 focus:outline-none focus:border-purple-400"
          />
          {wrong && (
            <p role="alert" className="text-sm text-red-500 font-body text-center">
              Not quite — have another go.
            </p>
          )}
          <button
            type="submit"
            className="w-full bg-purple-500 hover:bg-purple-600 text-white font-semibold py-3 rounded-2xl kid-shadow transition-colors"
          >
            Continue
          </button>
        </form>
      </motion.div>
    </div>
  );
}
