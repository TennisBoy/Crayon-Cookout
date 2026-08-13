import React, { useState, useEffect } from 'react';
import { hasNoAds } from '@/lib/premium';
import { Sparkles } from 'lucide-react';

export default function AdBar() {
  const [noAds, setNoAds] = useState(hasNoAds());

  useEffect(() => {
    const handler = () => setNoAds(hasNoAds());
    window.addEventListener('cc-premium-change', handler);
    return () => window.removeEventListener('cc-premium-change', handler);
  }, []);

  if (noAds) return null;

  return (
    <div className="no-print fixed bottom-0 inset-x-0 z-20 h-16 bg-white/80 backdrop-blur-md border-t border-purple-100 flex items-center justify-center px-4">
      <div className="flex items-center gap-2 text-sm text-gray-400 font-body">
        <Sparkles className="w-4 h-4" />
        <span>Advertisement placeholder — go ad-free with Premium!</span>
      </div>
    </div>
  );
}
