'use client';

import React, { useState } from 'react';
import OctoPlatformerGame from '@/components/OctoPlatformerGame';
import CodeViewerModal from '@/components/CodeViewerModal';

export default function HomePage() {
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);

  return (
    <main className="w-screen h-screen overflow-hidden bg-[#f4f4f4] relative">
      {/* Live Playable Game Engine */}
      <OctoPlatformerGame onOpenCodeViewer={() => setIsCodeModalOpen(true)} />

      {/* Standalone Code Viewer & Exporter Modal */}
      <CodeViewerModal
        isOpen={isCodeModalOpen}
        onClose={() => setIsCodeModalOpen(false)}
      />
    </main>
  );
}
