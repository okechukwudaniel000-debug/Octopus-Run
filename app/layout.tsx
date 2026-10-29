import type { Metadata, Viewport } from 'next';
import './globals.css';

export const viewport: Viewport = {
  themeColor: '#181717',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: 'OctoRun - 2D Grid Platformer',
  description: 'A minimalist grid-based 2D platformer web game featuring the Octocat character, physics, score block collectibles, full-screen magnet power-ups, crawling bug enemies, rainbow companion shield, and Web Audio API sounds.',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'OctoRun',
  },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  openGraph: {
    title: 'OctoRun - 2D Grid Platformer',
    description: 'A minimalist grid-based 2D platformer web game featuring the Octocat character, physics, score block collectibles, full-screen magnet power-ups, crawling bug enemies, rainbow companion shield, and Web Audio API sounds.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OctoRun - 2D Grid Platformer',
    description: 'A minimalist grid-based 2D platformer web game featuring the Octocat character, physics, score block collectibles, full-screen magnet power-ups, crawling bug enemies, rainbow companion shield, and Web Audio API sounds.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full bg-[#f4f4f4] text-slate-800 antialiased overflow-hidden select-none" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
