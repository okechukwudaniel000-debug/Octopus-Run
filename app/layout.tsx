import type {Metadata} from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'OctoRun - 2D Grid Platformer',
  description: 'A minimalist grid-based 2D platformer web game featuring the Octocat character, physics, collectibles, crawling bug enemies, rainbow companion power-ups, and Web Audio API sounds.',
  openGraph: {
    title: 'OctoRun - 2D Grid Platformer',
    description: 'A minimalist grid-based 2D platformer web game featuring the Octocat character, physics, collectibles, crawling bug enemies, rainbow companion power-ups, and Web Audio API sounds.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OctoRun - 2D Grid Platformer',
    description: 'A minimalist grid-based 2D platformer web game featuring the Octocat character, physics, collectibles, crawling bug enemies, rainbow companion power-ups, and Web Audio API sounds.',
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
