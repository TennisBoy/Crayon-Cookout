import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { completeOAuthSession } from '@/lib/adapters/auth';
import { Loader2, AlertCircle } from 'lucide-react';

/**
 * Landing point for a social sign-in.
 *
 * Supabase sends the session back in the URL fragment (`#access_token=...`),
 * which is never transmitted to a server. This page reads it, stores the
 * session, and gets rid of it: `replace` rather than `push` so the fragment
 * does not sit in history where Back would revisit it.
 */
export default function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState(null);

  useEffect(() => {
    const next = new URLSearchParams(window.location.search).get('next');
    // Only same-site paths — an absolute URL here would defeat the server-side
    // check that got us this far.
    const target = next && next.startsWith('/') && !next.startsWith('//') ? next : '/home';

    completeOAuthSession(window.location.hash)
      .then(() => navigate(target, { replace: true }))
      .catch((err) => setError(err.message));
  }, [navigate]);

  if (error) {
    return (
      <div className="min-h-screen rainbow-bg flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl kid-shadow p-8 max-w-sm text-center">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <h1 className="font-display font-bold text-xl text-gray-700 mb-2">
            That sign-in did not finish
          </h1>
          <p className="text-sm text-gray-500 font-body mb-5">{error}</p>
          <button
            type="button"
            onClick={() => navigate('/login', { replace: true })}
            className="bg-purple-500 hover:bg-purple-600 text-white font-semibold px-5 py-2.5 rounded-2xl kid-shadow transition-colors"
          >
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen rainbow-bg flex items-center justify-center">
      <div className="flex items-center gap-3 text-purple-600 font-body">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span>Signing you in…</span>
      </div>
    </div>
  );
}
