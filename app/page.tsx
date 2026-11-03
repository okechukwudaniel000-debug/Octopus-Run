'use client';

import React from 'react';
import dynamic from 'next/dynamic';

// Load OctoPlatformerGame client-side only to avoid SSR canvas/window hydration mismatches
const OctoPlatformerGame = dynamic(() => import('@/components/OctoPlatformerGame'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex flex-col items-center justify-center bg-[#f4f4f4] font-mono text-xs text-slate-500 gap-3">
      <div className="w-7 h-7 border-2 border-slate-300 border-t-slate-800 rounded-full animate-spin" />
      <span>Loading OctoRun...</span>
    </div>
  ),
});

export default function HomePage() {
  return (
    <main className="w-screen h-screen overflow-hidden bg-[#f4f4f4] relative">
      <OctoPlatformerGame />
    </main>
  );
}
